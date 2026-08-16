/**
 * Modelo del modo visual.
 *
 * La idea que sostiene todo lo demás: un bloque no *contiene* texto, sino que
 * *apunta* a un tramo del documento. Los bloques de un parseo particionan el
 * texto entero:
 *
 *   blocks.map(b => text.slice(b.span.from, b.span.to)).join('') === text
 *
 * De ahí sale gratis el principio de «nada se pierde»: un bloque que nadie
 * toca es, literalmente, su substring original. No hay serialización que pueda
 * reformatear el archivo a tus espaldas, y editar un campo solo reemplaza el
 * rango de ese campo — que es lo que permite que dos personas trabajen en
 * bloques distintos a la vez sin pisarse.
 */

/** Offsets absolutos en el Y.Text `'content'`. `to` es exclusivo. */
export interface Span {
  from: number
  to: number
}

/** Un campo editable. El span apunta al VALOR, sin sus delimitadores. */
export interface Field {
  name: string
  span: Span
  value: string
}

export type BlockKind =
  | 'section'    // \section{…} y \subsection{…}, con o sin estrella
  | 'caso'       // \begin{caso}{título} … \end{caso}
  | 'fuentes'    // \begin{fuentes} … \end{fuentes}
  | 'fuente'     // \fuente{url}, hijo de fuentes
  | 'pregunta'   // \pregunta{…}
  | 'respuesta'  // \begin{respuesta} … \end{respuesta}
  | 'mcq'        // \begin{mcq}{enunciado} … \end{mcq}
  | 'opcion'     // \opcion{…} / \opcion*{…}, hijo de mcq
  | 'porque'     // \porque{título}{texto}
  | 'input'      // \input{ruta}
  | 'env'        // \begin{cualquiera}{args…} … \end{cualquiera}
  | 'preamble'   // todo lo anterior a \begin{document}, agrupado
  | 'paragraph'  // prosa: se edita con formato, no como código
  | 'atom'       // macro suelta con nombre propio (\makewsheader, \wstitle…)
  | 'meta'       // los \ws* de meta.tex, agrupados
  | 'bibEntry'   // @tipo{clave, campo = {…}}
  | 'raw'        // cualquier otra cosa: se conserva tal cual

/**
 * Datos derivados que no son texto del documento.
 *
 * Un contenedor (`env`, `caso`, `respuesta`, `fuentes`, `mcq`) lleva siempre
 * `env`, `bodyFrom` y `bodyTo`: sin el rango del cuerpo no se sabe dónde meter
 * un hijo en un contenedor vacío. `nameFrom`/`nameTo` y `endNameFrom`/
 * `endNameTo` apuntan al nombre del entorno en el `\begin` y en el `\end`, que
 * son los dos rangos que hay que tocar a la vez para renombrarlo.
 */
export interface BlockMeta {
  nivel?: number
  env?: string
  /** Macro que representa un `atom`, o el que no se pudo leer en un `raw`. */
  cmd?: string
  bodyFrom?: number
  bodyTo?: number
  nameFrom?: number
  nameTo?: number
  endNameFrom?: number
  endNameTo?: number
}

export interface Block {
  /** Estable dentro de un parseo; sirve de `:key`. Ver `assignIds`. */
  id: string
  kind: BlockKind
  span: Span
  fields: Field[]
  /** Hijos de un contenedor. También particionan el cuerpo del padre. */
  items?: Block[]
  /** `\opcion*` → `{ correcta: true }`; `\section*` → `{ starred: true }`. */
  flags?: Record<string, boolean>
  meta?: BlockMeta
}

/** ¿Es un bloque que contiene a otros y admite hijos nuevos? */
export function isContainer(block: Block): boolean {
  return block.items !== undefined && block.meta?.bodyFrom !== undefined
}

/** Recorre el árbol de bloques en orden de documento. */
export function walkBlocks(blocks: Block[], fn: (block: Block, parent: Block | null) => void, parent: Block | null = null): void {
  for (const block of blocks) {
    fn(block, parent)
    if (block.items) walkBlocks(block.items, fn, block)
  }
}

/** Qué escáner toca, según la extensión del archivo. */
export type DocKind = 'tex' | 'bib'

export function docKindOf(path: string): DocKind | null {
  if (path.endsWith('.tex') || path.endsWith('.cls') || path.endsWith('.sty')) return 'tex'
  if (path.endsWith('.bib')) return 'bib'
  return null
}

/** Texto exacto que ocupa un bloque en el documento. */
export function sliceOf(text: string, span: Span): string {
  return text.slice(span.from, span.to)
}

/**
 * Identidad por posición en el árbol: `2.1.0` es el primer hijo del segundo hijo
 * del tercer bloque. Sirve de `:key` y, sobre todo, de dirección: una acción de
 * la interfaz vuelve a buscar su bloque **en el árbol recién parseado** antes de
 * escribir, en vez de fiarse del objeto que tenía cuando se pintó.
 *
 * Antes era `kind#ordinal` por lista, y el mismo `raw#1` existía dentro de cada
 * contenedor: el estado de plegado y los avisos de un bloque se los comía otro.
 */
export function assignIds(blocks: Block[], prefix = ''): Block[] {
  blocks.forEach((block, i) => {
    block.id = prefix === '' ? String(i) : `${prefix}.${i}`
    if (block.items) assignIds(block.items, block.id)
  })
  return blocks
}

/** El bloque que hoy ocupa esa dirección, o `null` si el árbol ya no llega ahí. */
export function blockAt(blocks: Block[], id: string): Block | null {
  let list = blocks
  let found: Block | null = null
  for (const part of id.split('.')) {
    found = list[Number(part)] ?? null
    if (!found) return null
    list = found.items ?? []
  }
  return found
}

/** Los hermanos de esa dirección: la lista donde vive el bloque. */
export function siblingsAt(blocks: Block[], id: string): Block[] {
  const parent = id.slice(0, id.lastIndexOf('.'))
  if (!id.includes('.')) return blocks
  return blockAt(blocks, parent)?.items ?? []
}
