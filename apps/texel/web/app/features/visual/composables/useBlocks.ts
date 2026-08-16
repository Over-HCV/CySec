/**
 * Estado reactivo de los bloques de un archivo.
 *
 * Reparsea el documento entero en cada cambio. Suena caro y no lo es: los
 * archivos del curso rondan los 2 KB y el escáner es una sola pasada. A cambio
 * no hay estado incremental que pueda desincronizarse del texto, que es el
 * único fallo del que no se vuelve.
 *
 * El foco no se conserva por identidad de bloque: cada campo guarda su borrador
 * mientras lo estás escribiendo y no se repinta hasta que lo sueltas (ver
 * `BlockField.vue`). Así da igual que los `id` cambien entre reparseos.
 */
import type * as Y from 'yjs'
import {
  applyFieldEdit, duplicateBlock, insertBlock, moveBlock, parseDoc, removeBlock, toggleOption,
  VISUAL_ORIGIN
} from '../lib/doc-sync'
import type { Block, BlockKind, DocKind, Field } from '../lib/types'

/** Espera antes de repintar por un cambio ajeno, para no parpadear al teclear. */
const REMOTE_DEBOUNCE_MS = 120

export function useBlocks(ytext: Y.Text, kind: DocKind) {
  const text = shallowRef(ytext.toString())
  const blocks = shallowRef<Block[]>(parseDoc(text.value, kind))
  /** Último aviso de validación, por campo. */
  const problems = ref<Record<string, string>>({})

  let timer: ReturnType<typeof setTimeout> | null = null

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
    ytext.unobserve(onChange as never)
  })

  /** Texto exacto que ocupa un bloque; es lo que enseña «ver LaTeX». */
  function sourceOf(block: Block): string {
    return text.value.slice(block.span.from, block.span.to)
  }

  function edit(block: Block, field: Field, value: string) {
    const key = `${block.id}:${field.name}`
    const problem = applyFieldEdit(ytext, field, value)
    if (problem) problems.value = { ...problems.value, [key]: problem }
    else if (problems.value[key]) {
      const next = { ...problems.value }
      delete next[key]
      problems.value = next
    }
  }

  return {
    text,
    blocks,
    /** Avisos de validación, indexados por `«id de bloque»:«campo»`. */
    problems,
    refresh,
    sourceOf,
    edit,
    insert: (at: number, blockKind: BlockKind) => insertBlock(ytext, at, blockKind),
    remove: (block: Block) => removeBlock(ytext, block),
    duplicate: (block: Block) => duplicateBlock(ytext, block),
    toggle: (block: Block) => toggleOption(ytext, block),
    move: (index: number, dir: -1 | 1) => moveBlock(ytext, blocks.value, index, dir)
  }
}
