/**
 * Primitivas de escaneo compartidas por los dos parsers.
 *
 * No hay AST ni tokenizador: se recorre el texto una vez y se anotan offsets.
 * Todo lo que estas funciones devuelven son rangos sobre el texto original.
 */
import type { Block, Span } from './types'

/** ¿El carácter en `i` está escapado por una barra impar de barras invertidas? */
export function isEscaped(text: string, i: number): boolean {
  let n = 0
  while (i - n - 1 >= 0 && text[i - n - 1] === '\\') n++
  return n % 2 === 1
}

/**
 * Lee un grupo delimitado que empieza en `open` (que debe estar en `i`) y
 * devuelve el rango del contenido y el índice justo tras el cierre.
 *
 * Cuenta anidamiento y respeta `\{` y `\}`. Si el grupo nunca cierra devuelve
 * `null`: el llamador lo trata como texto no reconocido en vez de inventarse un
 * final, que es como se corrompen documentos.
 */
export function readGroup(
  text: string,
  i: number,
  /**
   * Si `%` inicia comentario hasta fin de línea. Cierto en LaTeX; falso en
   * BibTeX, donde dentro de una entrada el `%` es literal — y aparece de hecho
   * en las URLs con codificación por porcentaje.
   */
  comments = true,
  open = '{',
  close = '}'
): { inner: Span, end: number } | null {
  if (text[i] !== open) return null
  let depth = 0
  for (let j = i; j < text.length; j++) {
    const c = text[j]
    if (c === '\\') { j++; continue }
    if (comments && c === '%') {
      // Comentario dentro de un argumento: llega hasta el fin de línea.
      const nl = text.indexOf('\n', j)
      if (nl === -1) return null
      j = nl
      continue
    }
    if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) return { inner: { from: i + 1, to: j }, end: j + 1 }
    }
  }
  return null
}

/**
 * Salta espacios en blanco desde `i`. Si `stopAtBlankLine`, se detiene antes de
 * una línea en blanco: un argumento de LaTeX no cruza un `\par`.
 */
export function skipSpace(text: string, i: number, stopAtBlankLine = true): number {
  let j = i
  let newlines = 0
  while (j < text.length) {
    const c = text[j]!
    if (c === '\n') {
      newlines++
      if (stopAtBlankLine && newlines > 1) return i
    } else if (c !== ' ' && c !== '\t' && c !== '\r') {
      break
    }
    j++
  }
  return j
}

/** Índice del final de la línea que contiene `i` (sin incluir el `\n`). */
export function lineEnd(text: string, i: number): number {
  const nl = text.indexOf('\n', i)
  return nl === -1 ? text.length : nl
}

/**
 * Extiende `to` para tragarse el resto de la línea si solo queda espacio, y los
 * saltos de línea que siguen. Así el bloque se queda su propia separación y el
 * hueco siguiente no empieza con un `\n` suelto.
 */
export function eatTrailingBlank(text: string, to: number): number {
  let j = to
  while (j < text.length && (text[j] === ' ' || text[j] === '\t' || text[j] === '\r')) j++
  if (text[j] === '\n') j++
  else return to
  // Líneas en blanco posteriores.
  while (j < text.length) {
    let k = j
    while (k < text.length && (text[k] === ' ' || text[k] === '\t' || text[k] === '\r')) k++
    if (text[k] === '\n') j = k + 1
    else break
  }
  return j
}

/**
 * Convierte un tramo no reconocido en bloques `raw`, cortando por línea en
 * blanco para que la prosa no acabe toda en un ladrillo único. Cada trozo se
 * queda sus saltos finales, de modo que los trozos siguen cubriendo el tramo
 * entero sin huecos ni solapes.
 */
export function rawBlocks(text: string, from: number, to: number): Block[] {
  if (to <= from) return []
  const out: Block[] = []
  let start = from
  let i = from

  while (i < to) {
    if (text[i] === '\n') {
      // ¿Empieza aquí una o más líneas en blanco?
      let j = i + 1
      let blank = false
      for (;;) {
        let k = j
        while (k < to && (text[k] === ' ' || text[k] === '\t' || text[k] === '\r')) k++
        if (k < to && text[k] === '\n') { j = k + 1; blank = true } else break
      }
      if (blank) {
        out.push(rawBlock(text, start, j))
        start = j
        i = j
        continue
      }
      i = j
      continue
    }
    i++
  }

  if (start < to) out.push(rawBlock(text, start, to))
  return out
}

function rawBlock(text: string, from: number, to: number): Block {
  const block: Block = { id: '', kind: 'raw', span: { from, to }, fields: [] }
  // Un hueco de solo espacios sigue formando parte de la partición (si no, el
  // documento dejaría de reconstruirse), pero la interfaz no lo pinta: nadie
  // quiere ver un bloque vacío entre cada par de bloques.
  if (text.slice(from, to).trim() === '') block.flags = { blank: true }
  return block
}

/** Rellena con bloques `raw` los huecos entre bloques reconocidos. */
export function fillGaps(text: string, found: Block[], from: number, to: number): Block[] {
  const out: Block[] = []
  let cursor = from
  for (const block of found) {
    out.push(...rawBlocks(text, cursor, block.span.from))
    out.push(block)
    cursor = block.span.to
  }
  out.push(...rawBlocks(text, cursor, to))
  return out
}

/** Un campo a partir del rango de su valor. */
export function field(text: string, name: string, span: Span): { name: string, span: Span, value: string } {
  return { name, span, value: text.slice(span.from, span.to) }
}
