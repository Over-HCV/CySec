/**
 * Lo que `VisualEditor` pone a disposición del árbol de bloques.
 *
 * Los bloques se anidan sin límite, así que encadenar `emit` de padre a padre
 * sería una escalera de reenvíos que solo sirve para perder el bloque por el
 * camino. Se inyecta una vez y cada `BlockNode` llama directamente.
 */
import type { InjectionKey, Ref } from 'vue'
import type { Block, BlockKind, Field } from './types'

export interface VisualApi {
  canWrite: boolean
  /** Texto completo del documento; los bloques solo guardan rangos. */
  text: Ref<string>
  /** Avisos de validación, indexados por «id de bloque»:«campo». */
  problems: Ref<Record<string, string>>
  /** Ids de los bloques plegados. */
  collapsed: Ref<Set<string>>
  toggleCollapse: (id: string) => void
  source: (block: Block) => string
  edit: (block: Block, field: Field, value: string) => void
  editBody: (block: Block, value: string) => void
  rename: (block: Block, name: string) => void
  /** Añade un hijo al final del contenedor. */
  addInside: (container: Block, kind?: BlockKind) => void
  /** Escribe texto al final del contenedor: la línea que cierra cada bloque. */
  writeInside: (container: Block, value: string) => void
  /** Intercambia el bloque con su vecino visible; resuelve hermanos por sí solo. */
  move: (block: Block, dir: -1 | 1) => void
  duplicate: (block: Block) => void
  remove: (block: Block) => void
  toggleOption: (block: Block) => void
}

export const VISUAL_API: InjectionKey<VisualApi> = Symbol('visual-api')
