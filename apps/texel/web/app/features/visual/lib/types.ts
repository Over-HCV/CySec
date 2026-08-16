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
  | 'bibEntry'   // @tipo{clave, campo = {…}}
  | 'raw'        // cualquier otra cosa: se conserva tal cual

export interface Block {
  /** Estable dentro de un parseo; sirve de `:key`. Ver `assignIds`. */
  id: string
  kind: BlockKind
  span: Span
  fields: Field[]
  /** Hijos de `fuentes` y `mcq`. También particionan el interior del padre. */
  items?: Block[]
  /** `\opcion*` → `{ correcta: true }`; `\section*` → `{ starred: true }`. */
  flags?: Record<string, boolean>
  /** Datos derivados que no son texto del documento (p. ej. nivel de sección). */
  meta?: Record<string, number | string>
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
 * Identidad para el `:key` de la lista. No intenta sobrevivir a un reparseo con
 * el contenido cambiado — no hace falta: los campos con el foco guardan su
 * borrador local y no se repintan mientras se escribe (ver `useBlocks`).
 */
export function assignIds(blocks: Block[]): Block[] {
  const seen = new Map<string, number>()
  for (const block of blocks) {
    const n = (seen.get(block.kind) ?? 0) + 1
    seen.set(block.kind, n)
    block.id = `${block.kind}#${n}`
    if (block.items) assignIds(block.items)
  }
  return blocks
}
