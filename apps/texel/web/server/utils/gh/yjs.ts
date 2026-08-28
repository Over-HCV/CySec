/**
 * El documento compartido, desde el servidor.
 *
 * Traer un archivo de GitHub no puede ser un `update` a `files.content`: quien
 * lo tenga abierto está editando un documento Yjs, y en su próximo volcado
 * escribiría encima de lo que acabamos de traer. Así que un cambio remoto entra
 * como lo que es —una edición más del documento compartido— y viaja por el
 * mismo canal que las demás.
 *
 * Gemelo en Deno: `supabase/functions/flush-doc/index.ts`. Aquí se rehace
 * porque el envío a GitHub no puede depender de que esa función esté desplegada
 * y en pie; si se toca el orden de escrituras o la poda de una, hay que tocar
 * la otra.
 */
import * as Y from 'yjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { minimalPatch } from '../../../app/features/editor/lib/format-tex'

/** Origen de las ediciones que entran desde el repositorio. */
const ORIGIN = 'github'

/** Estado reconstruido de un archivo: snapshot + log pendiente. */
interface DocState {
  doc: Y.Doc
  /** Los `seq` leídos, que son los únicos que se pueden podar. */
  seqs: number[]
  through: number
}

async function load(admin: SupabaseClient, fileId: string): Promise<DocState> {
  const doc = new Y.Doc()

  const { data: snapshot, error: snapshotError } = await admin
    .from('doc_snapshots').select('state, through_seq').eq('file_id', fileId).maybeSingle()
  if (snapshotError) throw snapshotError
  if (snapshot?.state) Y.applyUpdate(doc, Buffer.from(snapshot.state, 'base64'))

  const { data: updates, error: updatesError } = await admin
    .from('doc_updates').select('seq, update')
    .eq('file_id', fileId).gt('seq', snapshot?.through_seq ?? 0).order('seq', { ascending: true })
  if (updatesError) throw updatesError

  for (const row of updates ?? []) Y.applyUpdate(doc, Buffer.from(row.update as string, 'base64'))

  const seqs = (updates ?? []).map(row => row.seq as number)
  return { doc, seqs, through: Math.max(...seqs, snapshot?.through_seq ?? 0) }
}

async function save(admin: SupabaseClient, fileId: string, state: DocState): Promise<string> {
  const text = state.doc.getText('content').toString()

  // El orden importa, igual que en `flush-doc`: nada se poda hasta que el
  // snapshot y el texto están a salvo. Al revés, un fallo a mitad dejaría el
  // documento sin log y sin snapshot, es decir, en la versión de hace horas.
  const { error: snapshotError } = await admin.from('doc_snapshots').upsert({
    file_id: fileId,
    state: Buffer.from(Y.encodeStateAsUpdate(state.doc)).toString('base64'),
    through_seq: state.through,
    updated_at: new Date().toISOString()
  })
  if (snapshotError) throw snapshotError

  const { error: fileError } = await admin.from('files').update({
    content: text,
    size_bytes: Buffer.byteLength(text)
  }).eq('id', fileId)
  if (fileError) throw fileError

  if (state.seqs.length) {
    // Solo las filas leídas: `seq` es un `bigserial` y una fila con número menor
    // puede confirmarse después de la lectura. Un `lte(through)` se llevaría por
    // delante una edición que no está en el snapshot.
    const { error: pruneError } = await admin
      .from('doc_updates').delete().eq('file_id', fileId).in('seq', state.seqs)
    if (pruneError) throw pruneError
  }

  return text
}

/**
 * Compacta el log y devuelve el texto vigente. Es lo que hay que llamar antes
 * de mirar `files.content`: lo que se está tecleando ahora mismo todavía no ha
 * llegado ahí.
 */
export async function flushDoc(admin: SupabaseClient, fileId: string): Promise<string> {
  return save(admin, fileId, await load(admin, fileId))
}

export interface ApplyResult {
  /** `false` si el documento ya decía eso: no se escribe ni se emite nada. */
  changed: boolean
  text: string
}

/**
 * Deja `incoming` en el documento compartido, como una edición más: se guarda
 * y se emite a quien lo tenga abierto.
 */
export async function applyText(
  admin: SupabaseClient,
  fileId: string,
  incoming: string
): Promise<ApplyResult> {
  const state = await load(admin, fileId)
  const update = patchDoc(state.doc, incoming)
  if (!update) return { changed: false, text: incoming }

  const text = await save(admin, fileId, state)

  // No se añade nada a `doc_updates`: el snapshot que acaba de guardarse ya
  // lleva la edición dentro, así que quien abra el archivo después la ve. La
  // emisión es solo para quien lo tenga abierto ahora mismo.
  await broadcast(fileId, Buffer.from(update).toString('base64'))

  return { changed: true, text }
}

/**
 * Deja `incoming` en el texto del documento y devuelve el update que lo hace, o
 * `null` si ya decía eso.
 *
 * Se aplica el parche mínimo, no un borrar-e-insertar entero: en un documento
 * compartido, reescribirlo entero pisa lo que otra persona tenga a medio
 * escribir y le manda el cursor al principio. Devolver el update en vez de
 * reconstruirlo del texto es lo que hace que lo que se emite y lo que se guarda
 * sean lo mismo.
 */
export function patchDoc(doc: Y.Doc, incoming: string): Uint8Array | null {
  const ytext = doc.getText('content')
  const patch = minimalPatch(ytext.toString(), incoming)
  if (!patch) return null

  const produced: Uint8Array[] = []
  const capture = (update: Uint8Array, origin: unknown) => {
    if (origin === ORIGIN) produced.push(update)
  }
  doc.on('update', capture)
  doc.transact(() => {
    if (patch.remove) ytext.delete(patch.from, patch.remove)
    if (patch.insert) ytext.insert(patch.from, patch.insert)
  }, ORIGIN)
  doc.off('update', capture)

  return produced.length ? Y.mergeUpdates(produced) : null
}

/**
 * Emite el update por el mismo canal que usan los clientes
 * (`SupabaseYjsProvider`), para que quien tenga el archivo abierto vea el
 * cambio sin recargar. Si la emisión falla no se aborta nada: el cambio ya está
 * guardado y quien recargue lo verá igual.
 */
async function broadcast(fileId: string, update: string): Promise<void> {
  const url = process.env.SUPABASE_URL ?? process.env.NUXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return

  try {
    await $fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}` },
      body: { messages: [{ topic: `yjs:${fileId}`, event: 'update', payload: { u: update } }] }
    })
  } catch (error) {
    console.error('[github] no se pudo emitir el update por Realtime:', error)
  }
}
