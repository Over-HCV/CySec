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
  /**
   * Dónde se pide el cursor, como offset absoluto del documento. Lo reclama el
   * campo que contenga esa posición cuando se pinte, y al reclamarlo lo pone a
   * `null`: es lo que hace que el cursor sobreviva a un reparseo.
   */
  caret: Ref<number | null>
  placeCaret: (at: number | null) => void
  toggleCollapse: (id: string) => void
  source: (block: Block) => string
  edit: (block: Block, field: Field, value: string) => void
  /** Parte un campo de prosa en dos párrafos: la tecla Enter. */
  split: (block: Block, field: Field, before: string, after: string) => void
  editBody: (block: Block, value: string) => void
  rename: (block: Block, name: string) => void
  /** Añade un hijo al final del contenedor. */
  addInside: (container: Block, kind?: BlockKind, template?: string) => void
  /** Escribe texto al final del contenedor: la línea que cierra cada bloque. */
  writeInside: (container: Block, value: string) => void
  /** Intercambia el bloque con su vecino visible; resuelve hermanos por sí solo. */
  move: (block: Block, dir: -1 | 1) => void
  /** Suelta el bloque delante o detrás de otro hermano: el arrastrar-soltar. */
  moveTo: (sourceId: string, targetId: string, edge: 'before' | 'after') => void
  /** Id del bloque que se está arrastrando ahora mismo, si hay alguno. */
  dragging: Ref<string | null>
  /** Dónde se soltaría si se soltara ya; lo pinta la fila de destino. */
  dropTarget: Ref<{ id: string, edge: 'before' | 'after' } | null>
  duplicate: (block: Block) => void
  remove: (block: Block) => void
  toggleOption: (block: Block) => void
  /**
   * URL firmada de un archivo del proyecto, para pintar la miniatura de una
   * imagen. `null` si no hay proyecto (el banco de pruebas) o si el archivo no
   * está: el bloque lo dice en vez de enseñar una imagen rota.
   */
  assetUrl: (path: string) => Promise<string | null>
  /** ¿Se pueden subir imágenes? Falso en el banco de pruebas, que no tiene proyecto. */
  canUpload: boolean
  /**
   * Sube una imagen y la inserta como `figure`: detrás del bloque, o dentro de
   * él si es el contenedor donde se estaba escribiendo.
   */
  insertImage: (target: Block, file: File, where?: 'after' | 'inside') => Promise<void>
  /** Sube una imagen y escribe su ruta en el campo `ruta` de un bloque que ya existe. */
  replaceImage: (block: Block, file: File) => Promise<void>
}

export const VISUAL_API: InjectionKey<VisualApi> = Symbol('visual-api')
