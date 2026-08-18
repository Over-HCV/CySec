/**
 * Proveedor de Yjs sobre Supabase Realtime.
 *
 * Por qué propio y no `y-supabase`: ese paquete lleva años sin mantenimiento,
 * no cubre awareness (cursores) y asume una tabla por documento.
 *
 * Cómo funciona:
 *   - Transporte en vivo → canal de `broadcast` por archivo. Cada cliente emite
 *     sus updates de Yjs en base64 y aplica los ajenos. Los updates se agrupan
 *     cada FLUSH_MS antes de emitir: el plan gratis de Supabase cuenta mensajes,
 *     y teclear a 10 pulsaciones/segundo sin agrupar los quema rápido.
 *   - Persistencia → `doc_snapshots` (estado compactado) + `doc_updates` (log
 *     incremental). Al abrir se reconstruye desde ahí; al escribir se va
 *     añadiendo al log con debounce.
 *   - Sincronización entre pares → al conectar se pide el estado a quien ya esté
 *     dentro (state vector), por si alguien tiene cambios aún no persistidos.
 */
import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness'
import { toBase64, fromBase64 } from 'lib0/buffer'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { seedDoc } from './seed'

/** Intervalo de agrupación de updates antes de emitirlos por el canal. */
const FLUSH_MS = 50
/** Cada cuánto se vuelca al log de la base de datos. */
const PERSIST_MS = 2000

export interface ProviderUser {
  id: string
  name: string
  color: string
}

export interface ProviderOptions {
  supabase: SupabaseClient
  fileId: string
  user: ProviderUser
  /** Un `viewer` recibe cambios pero no persiste ni emite los suyos. */
  canWrite?: boolean
  /** Se llama cuando cambia el conjunto de colaboradores conectados. */
  onPeers?: (peers: ProviderUser[]) => void
  /** Se llama al terminar la carga inicial desde la base de datos. */
  onSynced?: () => void
}

export class SupabaseYjsProvider {
  readonly doc: Y.Doc
  readonly awareness: Awareness

  private supabase: SupabaseClient
  private fileId: string
  private user: ProviderUser
  private canWrite: boolean
  private onPeers?: (peers: ProviderUser[]) => void
  private onSynced?: () => void

  private channel: RealtimeChannel | null = null
  private pendingBroadcast: Uint8Array[] = []
  private pendingPersist: Uint8Array[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private persistTimer: ReturnType<typeof setInterval> | null = null
  private destroyed = false

  constructor(doc: Y.Doc, opts: ProviderOptions) {
    this.doc = doc
    this.supabase = opts.supabase
    this.fileId = opts.fileId
    this.user = opts.user
    this.canWrite = opts.canWrite ?? true
    this.onPeers = opts.onPeers
    this.onSynced = opts.onSynced

    this.awareness = new Awareness(doc)
    this.awareness.setLocalStateField('user', opts.user)

    this.doc.on('update', this.handleLocalUpdate)
    this.awareness.on('update', this.handleAwarenessUpdate)
  }

  /** Carga el estado persistido y se engancha al canal en vivo. */
  async connect(): Promise<void> {
    await this.loadFromDatabase()
    this.onSynced?.()

    const channel = this.supabase.channel(`yjs:${this.fileId}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: this.user.id }
      }
    })

    channel
      .on('broadcast', { event: 'update' }, ({ payload }) => {
        // origen 'remote': evita reenviar lo que acabamos de recibir
        Y.applyUpdate(this.doc, fromBase64(payload.u), 'remote')
      })
      .on('broadcast', { event: 'awareness' }, ({ payload }) => {
        applyAwarenessUpdate(this.awareness, fromBase64(payload.a), 'remote')
      })
      .on('broadcast', { event: 'state-request' }, ({ payload }) => {
        // Alguien acaba de entrar: le mandamos lo que le falta de nuestro doc.
        const diff = Y.encodeStateAsUpdate(this.doc, fromBase64(payload.sv))
        if (diff.length > 0) {
          channel.send({ type: 'broadcast', event: 'update', payload: { u: toBase64(diff) } })
        }
        // Y también nuestro cursor. El awareness solo se emite al cambiar, así
        // que sin esto quien llega no ve a los que ya estaban hasta que alguno
        // teclea —o hasta que y-protocols renueva su reloj, unos 15 segundos.
        this.handleAwarenessUpdate({ added: [this.doc.clientID], updated: [], removed: [] })
      })
      // `{ event: 'sync' }`, no `{ sync: true }`: el despacho de Realtime compara
      // `filter.event` con el evento entrante, así que un filtro sin `.event`
      // nunca casa y el callback no se ejecuta jamás. Estuvo así, con un
      // `as never` tapando el error de tipos, y el efecto era que la lista de
      // colaboradores se quedaba vacía para todo el mundo. `sync` cubre también
      // las entradas y salidas, de ahí que no haga falta escuchar `join`/`leave`.
      .on('presence', { event: 'sync' }, () => this.emitPeers())

    // Antes del `await`: `handleAwarenessUpdate` se planta si `this.channel`
    // todavía es nulo, y el anuncio del cursor de más abajo pasa por ahí.
    this.channel = channel

    await channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return
      await channel.track({ user: this.user })
      // Pedimos a los presentes lo que tengan y nosotros no.
      channel.send({
        type: 'broadcast',
        event: 'state-request',
        payload: { sv: toBase64(Y.encodeStateVector(this.doc)) }
      })
      // Y anunciamos nuestro cursor.
      this.handleAwarenessUpdate({ added: [this.doc.clientID], updated: [], removed: [] })
    })

    if (this.canWrite) {
      this.persistTimer = setInterval(() => void this.persist(), PERSIST_MS)
    }
  }

  /**
   * Cierra el proveedor. **Hay que esperarlo**: dentro va la última escritura al
   * log, y quien cierre sin esperar (o invoque `flush-doc` a la vez) puede
   * dejar fuera del snapshot lo último que se tecleó.
   */
  async destroy(): Promise<void> {
    if (this.destroyed) return
    this.destroyed = true

    this.doc.off('update', this.handleLocalUpdate)
    // El listener de awareness NO se quita aquí: `removeAwarenessStates` de más
    // abajo tiene que pasar por él para que la retirada del cursor se emita. Si
    // se desengancha antes, los demás se quedan con un cursor fantasma hasta que
    // les caduca solo, medio minuto después.
    if (this.flushTimer) clearTimeout(this.flushTimer)
    if (this.persistTimer) clearInterval(this.persistTimer)
    this.flushTimer = null
    this.persistTimer = null

    // Lo que quedara sin emitir se manda ahora: quien siga conectado lo aplica
    // sin esperar a recargar la página.
    if (this.channel && this.pendingBroadcast.length > 0) {
      const merged = Y.mergeUpdates(this.pendingBroadcast)
      this.pendingBroadcast = []
      this.channel.send({ type: 'broadcast', event: 'update', payload: { u: toBase64(merged) } })
    }

    removeAwarenessStates(this.awareness, [this.doc.clientID], 'local')
    this.awareness.off('update', this.handleAwarenessUpdate)

    // Un reintento: ya no queda temporizador que recoja lo que falle, y lo que
    // no llegue al log no lo ve nadie nunca más.
    if (!await this.persist()) await this.persist()

    if (this.channel) void this.supabase.removeChannel(this.channel)
    this.channel = null
    this.awareness.destroy()
  }

  /**
   * Actualiza la identidad que ven los demás.
   *
   * Hace falta porque el nombre no está listo al montar el editor: sale de
   * `profiles`, que se lee de la base después. Sin esto, lo que se publica al
   * conectar —el correo, o «Anónimo» si aún no había ni sesión— es lo que ven
   * los demás durante toda la sesión.
   *
   * `track` sobre una clave que ya está presente reemplaza su meta, no añade
   * otra entrada.
   */
  setUser(user: ProviderUser): void {
    this.user = user
    this.awareness.setLocalStateField('user', user)
    void this.channel?.track({ user })
  }

  /** Texto plano actual, para volcarlo a `files.content` antes de compilar. */
  get text(): string {
    return this.doc.getText('content').toString()
  }

  // ── internos ───────────────────────────────────────────────────────────────

  private handleLocalUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === 'remote') return
    this.pendingBroadcast.push(update)
    if (this.canWrite) this.pendingPersist.push(update)
    this.scheduleFlush()
  }

  private handleAwarenessUpdate = ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }) => {
    if (!this.channel) return
    const changed = added.concat(updated, removed)
    const payload = encodeAwarenessUpdate(this.awareness, changed)
    this.channel.send({ type: 'broadcast', event: 'awareness', payload: { a: toBase64(payload) } })
  }

  private scheduleFlush() {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      if (!this.channel || this.pendingBroadcast.length === 0) return
      // Un solo mensaje con todas las pulsaciones del intervalo.
      const merged = Y.mergeUpdates(this.pendingBroadcast)
      this.pendingBroadcast = []
      this.channel.send({ type: 'broadcast', event: 'update', payload: { u: toBase64(merged) } })
    }, FLUSH_MS)
  }

  /** Reconstruye el documento: snapshot + updates posteriores. */
  private async loadFromDatabase(): Promise<void> {
    const { data: snapshot } = await this.supabase
      .from('doc_snapshots')
      .select('state, through_seq')
      .eq('file_id', this.fileId)
      .maybeSingle()

    let through = 0
    if (snapshot?.state) {
      Y.applyUpdate(this.doc, fromBase64(snapshot.state), 'remote')
      through = snapshot.through_seq ?? 0
    }

    const { data: updates } = await this.supabase
      .from('doc_updates')
      .select('seq, update')
      .eq('file_id', this.fileId)
      .gt('seq', through)
      .order('seq', { ascending: true })

    for (const row of updates ?? []) {
      Y.applyUpdate(this.doc, fromBase64(row.update as string), 'remote')
    }

    // Documento nunca editado: sembramos con el contenido plano del archivo,
    // que es lo que existe cuando el proyecto se creó o se importó.
    //
    // La siembra va por `seedDoc` y no por un `insert` suelto: dos clientes que
    // abran el archivo antes de que ninguno haya persistido siembran los dos, y
    // solo un update determinista evita que Yjs entrelace el documento consigo
    // mismo. Ver `lib/seed.ts`.
    if (this.doc.getText('content').length === 0 && !snapshot && (updates?.length ?? 0) === 0) {
      const { data: file } = await this.supabase
        .from('files')
        .select('content')
        .eq('id', this.fileId)
        .single()
      if (file?.content) seedDoc(this.doc, file.content, this.canWrite)
    }
  }

  /** `false` si quedó algo sin escribir; el llamador decide si reintenta. */
  private async persist(): Promise<boolean> {
    if (!this.canWrite || this.pendingPersist.length === 0) return true
    const merged = Y.mergeUpdates(this.pendingPersist)
    this.pendingPersist = []
    const { error } = await this.supabase.from('doc_updates').insert({
      file_id: this.fileId,
      update: toBase64(merged),
      client_id: String(this.doc.clientID)
    })
    // Si falla, devolvemos el update a la cola: se reintenta en el siguiente ciclo.
    if (error) {
      this.pendingPersist.unshift(merged)
      return false
    }
    return true
  }

  private emitPeers() {
    if (!this.channel || !this.onPeers) return
    const state = this.channel.presenceState<{ user: ProviderUser }>()
    const peers = Object.values(state)
      .flat()
      .map(p => p.user)
      .filter(u => u && u.id !== this.user.id)
    this.onPeers(peers)
  }
}
