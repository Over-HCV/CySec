/**
 * La rejilla de un `tabular` en rangos sobre el documento.
 *
 * Una tabla de LaTeX es texto plano con dos separadores: `&` entre celdas y
 * `\\` entre filas. Aquí no se construye ninguna tabla: se anota dónde empieza
 * y acaba cada celda, igual que hace el resto del modo visual, y así editar una
 * celda es reemplazar su rango y nada más — la alineación a mano del archivo,
 * los `\toprule` y un `\multicolumn` que nadie ha tocado siguen donde estaban.
 *
 * Las reglas horizontales (`\toprule`, `\midrule`, `\hline`…) no son filas: van
 * pegadas delante de la fila que separan, así que se guardan aparte como
 * `lead`. Sin eso, la primera celda de la tabla del taller sería
 * «\toprule \normalfont\bfseries Opción» en vez de «Opción».
 */
import { trimSpan } from './scan'
import type { Span, TableMeta, TableRow } from './types'

/** Macros que dibujan una línea y no son contenido de ninguna celda. */
const RULES = /^\\(top|mid|bottom|c?mid)rule\b|^\\hline\b|^\\addlinespace\b|^\\cmidrule\b/

/**
 * Lee el cuerpo de un `tabular` entre `from` y `to`.
 *
 * Devuelve `null` cuando ahí no hay una tabla que se pueda enseñar como
 * rejilla —ni una sola celda—, y entonces quien llama la deja como estaba: es
 * la misma regla que con un `figure` sin imagen.
 */
export function readGrid(text: string, from: number, to: number): TableMeta | null {
  const rows: TableRow[] = []
  let start = from
  let i = from
  let depth = 0
  let cells: number[] = []

  const close = (end: number, next: number) => {
    rows.push(row(text, start, end, cells))
    cells = []
    start = next
  }

  while (i < to) {
    const c = text[i]!

    if (c === '%') { i = endOfLine(text, i, to); continue }
    if (c === '{') { depth++; i++; continue }
    if (c === '}') { depth--; i++; continue }
    if (c === '&' && depth === 0) { cells.push(i); i++; continue }

    if (c === '\\') {
      // `\\` cierra la fila; `\&` o `\{` son un carácter escapado; cualquier
      // otro macro se salta entero para que su nombre no se lea como texto.
      if (text[i + 1] === '\\') {
        let end = i + 2
        // El `[2pt]` opcional que a veces sigue al salto de fila.
        if (text[end] === '[') {
          const bracket = text.indexOf(']', end)
          if (bracket !== -1 && bracket < to) end = bracket + 1
        }
        let next = end
        while (next < to && (text[next] === ' ' || text[next] === '\t' || text[next] === '\r')) next++
        if (text[next] === '\n') next++
        close(next, next)
        i = next
        continue
      }
      i += 2
      continue
    }

    i++
  }

  // Lo que quede tras el último `\\` es una fila más si tiene algo que enseñar;
  // si solo es el `\bottomrule` y espacios, es una regla suelta.
  if (start < to) rows.push(row(text, start, to, cells))

  const conCeldas = rows.filter(r => r.cells.length > 0)
  if (!conCeldas.length) return null

  return {
    cols: Math.max(...conCeldas.map(r => r.cells.length)),
    rows
  }
}

/**
 * Una fila: sus reglas de cabecera, sus celdas y el rango entero.
 *
 * `breaks` son las posiciones de los `&` de primer nivel, que es lo único que
 * hace falta para partirla: las celdas son los huecos entre ellos.
 */
function row(text: string, from: number, to: number, breaks: number[]): TableRow {
  const lead = leadingRules(text, from, to)
  const inicio = lead ? lead.to : from
  const bordes = breaks.filter(b => b >= inicio)

  const spans: Span[] = []
  let cursor = inicio
  for (const border of bordes) {
    spans.push(trimSpan(text, { from: cursor, to: border }))
    cursor = border + 1
  }
  spans.push(trimSpan(text, { from: cursor, to: contentEnd(text, to) }))

  const fila: TableRow = { span: { from, to }, cells: spans }
  if (lead) {
    fila.lead = lead
    fila.rule = text.slice(lead.from, lead.to).trim()
  }

  // Una fila sin nada escrito y sin `&` no es una fila: es el hueco entre el
  // `\bottomrule` y el `\end{tabular}`.
  if (fila.cells.length === 1 && text.slice(fila.cells[0]!.from, fila.cells[0]!.to).trim() === '') {
    fila.cells = []
  }
  return fila
}

/** Las reglas que abren la fila, si las hay: `\toprule`, `\midrule`, `\hline`… */
function leadingRules(text: string, from: number, to: number): Span | null {
  let i = from
  let end: number | null = null
  for (;;) {
    while (i < to && /\s/.test(text[i]!)) i++
    if (i >= to || text[i] !== '\\') break
    const resto = text.slice(i, to)
    if (!RULES.test(resto)) break
    // El macro entero, con el `{…}` de un `\cmidrule{2-3}` si lo lleva.
    let j = i + 1
    while (j < to && /[A-Za-z]/.test(text[j]!)) j++
    if (text[j] === '(' || text[j] === '[' || text[j] === '{') {
      const cierre = { '(': ')', '[': ']', '{': '}' }[text[j]!]!
      const k = text.indexOf(cierre, j)
      if (k !== -1 && k < to) j = k + 1
    }
    end = j
    i = j
  }
  return end === null ? null : { from, to: end }
}

/**
 * El final del contenido de la fila: por detrás quedan el `\\` que la cierra,
 * su `[2pt]` opcional y el salto de línea, que son del documento y no de la
 * última celda.
 */
function contentEnd(text: string, to: number): number {
  let end = to
  const espacios = () => { while (end > 0 && /\s/.test(text[end - 1]!)) end-- }

  espacios()
  if (text[end - 1] === ']') {
    const abre = text.lastIndexOf('[', end - 1)
    if (abre > 1 && text.slice(abre - 2, abre) === '\\\\') end = abre
  }
  if (text.slice(end - 2, end) === '\\\\') { end -= 2; espacios() }
  return end
}

function endOfLine(text: string, i: number, to: number): number {
  const nl = text.indexOf('\n', i)
  return nl === -1 || nl > to ? to : nl + 1
}
