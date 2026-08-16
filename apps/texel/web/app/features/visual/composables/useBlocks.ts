/**
 * Estado reactivo de los bloques de un archivo.
 *
 * Reparsea el documento entero en cada cambio. Suena caro y no lo es: los
 * archivos del curso rondan los 2 KB y el escáner es una sola pasada. A cambio
 * no hay estado incremental que pueda desincronizarse del texto, que es el
 * único fallo del que no se vuelve.
 *
 * Toda acción vuelve a buscar su bloque en el árbol recién parseado antes de
 * escribir (`resolve`), y toda escritura comprueba que el documento siga
 * diciendo lo que el bloque cree (`STALE`). Entre lo que se pinta y lo que se
 * pulsa caben 300 ms del campo que se estaba escribiendo, 120 ms de un cambio
 * ajeno y un segundo clic; sin las dos cosas, esos huecos escriben en el sitio
 * equivocado y descolocan el archivo.
 *
 * El foco no se conserva por identidad de bloque: cada campo guarda su borrador
 * mientras lo estás escribiendo y no se repinta hasta que lo sueltas (ver
 * `BlockField.vue`).
 */
import type * as Y from 'yjs'
import {
  applyBodyEdit, applyFieldEdit, duplicateBlock, insertBlock, insideOf, moveBlock, parseDoc,
  removeBlock, renameEnv, STALE, toggleOption, VISUAL_ORIGIN, type EditProblem
} from '../lib/doc-sync'
import { childKind } from '../lib/catalog'
import { blockAt, siblingsAt, type Block, type BlockKind, type DocKind, type Field } from '../lib/types'

/** Espera antes de repintar por un cambio ajeno, para no parpadear al teclear. */
const REMOTE_DEBOUNCE_MS = 120

/** Cuánto se enseña el aviso de «el documento cambió». */
const NOTICE_MS = 4000

export function useBlocks(ytext: Y.Text, kind: DocKind) {
  const text = shallowRef(ytext.toString())
  const blocks = shallowRef<Block[]>(parseDoc(text.value, kind))
  /** Último aviso de validación, por campo. */
  const problems = ref<Record<string, string>>({})
  /** Aviso pasajero cuando una acción llegó tarde. */
  const notice = ref<string | null>(null)
  /**
   * Bloques plegados, por `id`. Es estado de vista: no toca el documento y se
   * pierde al cerrar. El preámbulo empieza plegado porque es andamiaje, no
   * contenido.
   */
  const collapsed = ref(new Set<string>(
    blocks.value.filter(b => b.kind === 'preamble').map(b => b.id)
  ))

  let timer: ReturnType<typeof setTimeout> | null = null
  let noticeTimer: ReturnType<typeof setTimeout> | null = null
  /**
   * Hay una acción que cambió la estructura y la interfaz aún no se ha
   * repintado. Las direcciones (`2.1.0`) todavía apuntan al árbol de antes, así
   * que un segundo clic se ignora hasta el siguiente pintado.
   */
  let restructuring = false

  function refresh() {
    if (timer) { clearTimeout(timer); timer = null }
    text.value = ytext.toString()
    blocks.value = parseDoc(text.value, kind)
  }

  function onChange(_event: unknown, transaction: { origin: unknown }) {
    // Lo nuestro se repinta ya: los rangos posteriores acaban de desplazarse y
    // seguir usándolos escribiría en el sitio equivocado.
    if (transaction.origin === VISUAL_ORIGIN) { refresh(); return }
    if (timer) return
    timer = setTimeout(() => { timer = null; refresh() }, REMOTE_DEBOUNCE_MS)
  }

  ytext.observe(onChange as never)
  onScopeDispose(() => {
    if (timer) clearTimeout(timer)
    if (noticeTimer) clearTimeout(noticeTimer)
    ytext.unobserve(onChange as never)
  })

  /** Texto exacto que ocupa un bloque; es lo que enseña «ver LaTeX». */
  function sourceOf(block: Block): string {
    return text.value.slice(block.span.from, block.span.to)
  }

  /** El mismo bloque, pero del parseo de ahora mismo. */
  function resolve(block: Block): Block | null {
    return blockAt(blocks.value, block.id)
  }

  function warn(message: string) {
    notice.value = message
    if (noticeTimer) clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => { notice.value = null }, NOTICE_MS)
  }

  /** Deja constancia del aviso de un campo, o lo retira si ya se resolvió. */
  function report(key: string, problem: EditProblem) {
    if (problem === STALE) {
      refresh()
      warn('El documento cambió mientras tanto. Inténtalo otra vez.')
      return
    }
    if (problem) problems.value = { ...problems.value, [key]: problem }
    else if (problems.value[key]) {
      const next = { ...problems.value }
      delete next[key]
      problems.value = next
    }
  }

  /**
   * Ejecuta una acción que cambia la estructura del documento: se resuelve el
   * bloque contra el árbol de ahora y se bloquean las siguientes hasta repintar.
   */
  function structural(block: Block, fn: (fresh: Block) => EditProblem) {
    if (restructuring) return
    const fresh = resolve(block)
    if (!fresh) { refresh(); warn('El bloque ya no está donde estaba.'); return }

    const problem = fn(fresh)
    if (problem === STALE) {
      refresh()
      warn('El documento cambió mientras tanto. Inténtalo otra vez.')
      return
    }
    restructuring = true
    void nextTick(() => { restructuring = false })
  }

  function edit(block: Block, field: Field, value: string) {
    // El campo se busca en el árbol de ahora: entre que se tecleó y que se
    // guarda (300 ms) el documento ha podido moverse por debajo.
    const fresh = resolve(block)
    const target = fresh?.fields.find(f => f.name === field.name) ?? field
    report(`${block.id}:${field.name}`, applyFieldEdit(ytext, target, value))
  }

  function editBody(block: Block, value: string) {
    const fresh = resolve(block)
    if (!fresh) return
    report(`${block.id}:cuerpo`, applyBodyEdit(ytext, fresh, value, text.value))
  }

  function rename(block: Block, name: string) {
    const fresh = resolve(block)
    if (!fresh) return
    report(`${block.id}:env`, renameEnv(ytext, fresh, name))
  }

  function toggleCollapse(id: string) {
    const next = new Set(collapsed.value)
    if (!next.delete(id)) next.add(id)
    collapsed.value = next
  }

  /**
   * Escribe texto al final de un contenedor: es lo que hace la línea en blanco
   * que cierra cada bloque con hijos.
   *
   * Se inserta con sus saltos de línea propios para que al reparsear salga un
   * párrafo de verdad y no se pegue al bloque anterior.
   */
  function writeInside(container: Block, value: string) {
    const fresh = resolve(container)
    if (!fresh) { refresh(); return }
    const at = insideOf(fresh)
    if (at === null) return

    const before = text.value.slice(0, at)
    const prefix = before.endsWith('\n\n') || before.endsWith('\n') ? '' : '\n'
    // Dentro de una lista, escribir crea el elemento que toca: en «Fuentes» un
    // enlace y en una pregunta de selección múltiple una opción. En cualquier
    // otro contenedor, un párrafo.
    const cuerpo = fresh.kind === 'fuentes' ? `  \\fuente{${value}}\n`
      : fresh.kind === 'mcq' ? `  \\opcion{${value}}\n`
        : `${value}\n`
    const problem = applyFieldEdit(ytext, {
      name: 'nuevo',
      span: { from: at, to: at },
      value: ''
    }, `${prefix}${cuerpo}`)
    if (problem === STALE) {
      refresh()
      warn('El documento cambió mientras tanto. Inténtalo otra vez.')
    }
  }

  /** Añade un hijo al final de un contenedor. */
  function addInside(container: Block, blockKind?: BlockKind) {
    structural(container, (fresh) => {
      const at = insideOf(fresh)
      if (at === null) return null
      const guard = { span: fresh.span, expected: sourceOf(fresh) }
      const result = insertBlock(ytext, at, blockKind ?? childKind(fresh.kind), guard)
      return result === STALE ? STALE : null
    })
  }

  function insert(at: number, blockKind: BlockKind) {
    if (insertBlock(ytext, at, blockKind) === STALE) refresh()
  }

  return {
    text,
    blocks,
    /** Avisos de validación, indexados por `«id de bloque»:«campo»`. */
    problems,
    /** Aviso pasajero cuando una acción llegó tarde; `null` si no hay. */
    notice,
    collapsed,
    toggleCollapse,
    refresh,
    sourceOf,
    edit,
    editBody,
    rename,
    addInside,
    insert,
    writeInside,
    remove: (block: Block) => structural(block, f => removeBlock(ytext, f, text.value)),
    duplicate: (block: Block) => structural(block, f => duplicateBlock(ytext, f, text.value)),
    toggle: (block: Block) => structural(block, f => toggleOption(ytext, f, text.value)),
    move: (block: Block, dir: -1 | 1) => structural(block, (fresh) => {
      const siblings = siblingsAt(blocks.value, fresh.id)
      const index = siblings.indexOf(fresh)
      if (index === -1) return STALE
      return moveBlock(ytext, siblings, index, dir, text.value)
    })
  }
}
