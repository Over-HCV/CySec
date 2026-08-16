/**
 * Marcas dentro de un párrafo: negrita, cursiva, código.
 *
 * Es la pieza que permite que el modo visual deje de enseñar LaTeX. Un texto
 * como
 *
 *   Marca tu elección con \texttt{\textbackslash opcion*}.
 *
 * se convierte en nodos que la interfaz pinta como texto normal con un trozo en
 * monoespaciada, y al escribir se vuelve a serializar **exactamente** al mismo
 * LaTeX. Esa ida y vuelta exacta es la condición para que esto sea seguro: si
 * serializar cambiara un solo byte, cada vez que alguien tocara un párrafo
 * cambiaría el PDF de todos.
 *
 * Regla de oro: lo que no se sabe representar **no se toca**. Un `\cite{…}`, un
 * `\url{…}` o un macro que nadie ha visto se guardan como un nodo opaco con su
 * texto literal; la interfaz los enseña como una ficha que se puede mover o
 * borrar entera, pero no romper por dentro.
 */
import { readGroup } from './scan'

export type Mark = 'bold' | 'italic' | 'code'

export type InlineNode =
  /** Texto llano, ya sin escapes de LaTeX. */
  | { kind: 'text', value: string }
  /** Un tramo marcado. `cmd` recuerda con qué macro se escribió. */
  | { kind: 'mark', mark: Mark, cmd: string, children: InlineNode[] }
  /** Un carácter que en LaTeX va escapado (`\%`, `\_`, `\textbackslash`…). */
  | { kind: 'escape', value: string, source: string }
  /** Cualquier otra cosa: se conserva literal y no se edita por dentro. */
  | { kind: 'opaque', source: string, label: string }

/**
 * Macros que son solo formato. El valor semántico (`\term`, `\eng`) se pinta
 * igual que su equivalente tipográfico, pero se serializa con su propio nombre:
 * quien escribió `\term{cifrado}` quería decir «concepto clave», no «negrita».
 */
const MARKS: Record<string, Mark> = {
  textbf: 'bold',
  term: 'bold',
  emph: 'italic',
  textit: 'italic',
  eng: 'italic',
  texttt: 'code'
}

/** Escapes de un solo carácter: `\%` es un porcentaje, no un comentario. */
const ESCAPES: Record<string, string> = {
  '\\%': '%',
  '\\&': '&',
  '\\_': '_',
  '\\#': '#',
  '\\$': '$',
  '\\{': '{',
  '\\}': '}'
}

/** Macros sin argumento que representan un carácter. */
const NAMED_ESCAPES: Record<string, string> = {
  textbackslash: '\\',
  ldots: '…',
  dots: '…',
  textasciitilde: '~'
}

export function parseInline(latex: string): InlineNode[] {
  const out: InlineNode[] = []
  let text = ''
  let i = 0

  const flush = () => {
    if (text) { out.push({ kind: 'text', value: text }); text = '' }
  }

  while (i < latex.length) {
    const c = latex[i]!

    // Un comentario llega hasta el fin de línea y no se imprime. Se conserva
    // tal cual: en los archivos del curso marca el final de un argumento y
    // quitarlo cambiaría los espacios del PDF.
    if (c === '%') {
      const nl = latex.indexOf('\n', i)
      const end = nl === -1 ? latex.length : nl
      flush()
      out.push({ kind: 'opaque', source: latex.slice(i, end), label: 'comentario' })
      i = end
      continue
    }

    if (c !== '\\') { text += c; i++; continue }

    const escape = ESCAPES[latex.slice(i, i + 2)]
    if (escape) {
      flush()
      out.push({ kind: 'escape', value: escape, source: latex.slice(i, i + 2) })
      i += 2
      continue
    }

    const name = commandName(latex, i)
    if (!name) { text += c; i++; continue }

    const named = NAMED_ESCAPES[name.value]
    if (named) {
      flush()
      // `\textbackslash opcion` — el espacio que separa el macro de la palabra
      // siguiente forma parte del macro y hay que devolverlo al serializar.
      const source = latex.slice(i, name.end + (latex[name.end] === ' ' ? 1 : 0))
      out.push({ kind: 'escape', value: named, source })
      i = i + source.length
      continue
    }

    const mark = MARKS[name.value]
    const group = mark ? readGroup(latex, name.end, false) : null
    if (mark && group) {
      flush()
      out.push({
        kind: 'mark',
        mark,
        cmd: name.value,
        children: parseInline(latex.slice(group.inner.from, group.inner.to))
      })
      i = group.end
      continue
    }

    // Macro desconocido, o conocido pero con el argumento sin cerrar: se traga
    // entero con su grupo si lo tiene, y se queda opaco.
    const arg = readGroup(latex, name.end, false)
    const end = arg ? arg.end : name.end
    flush()
    out.push({ kind: 'opaque', source: latex.slice(i, end), label: `\\${name.value}` })
    i = end
  }

  flush()
  return out
}

export function serializeInline(nodes: InlineNode[]): string {
  let out = ''
  for (const node of nodes) {
    switch (node.kind) {
      case 'text': out += node.value; break
      case 'escape': out += node.source; break
      case 'opaque': out += node.source; break
      case 'mark': out += `\\${node.cmd}{${serializeInline(node.children)}}`; break
    }
  }
  return out
}

/** Texto llano de un árbol de nodos, para medir, buscar o enseñar un resumen. */
export function plainText(nodes: InlineNode[]): string {
  return nodes.map((node) => {
    switch (node.kind) {
      case 'text': return node.value
      case 'escape': return node.value
      case 'opaque': return node.label === 'comentario' ? '' : node.source
      case 'mark': return plainText(node.children)
    }
  }).join('')
}

/**
 * Macros que aparecen *dentro* de un párrafo. No sabemos pintarlas, pero no
 * sacan al texto de ser texto: se quedan como una ficha en medio de la frase.
 */
const INLINE_OK = new Set([
  '\\cite', '\\citep', '\\citet', '\\url', '\\href', '\\ref', '\\cref', '\\Cref',
  '\\footnote', '\\label', '\\textsc', '\\textsl', '\\underline', '\\ ', '\\\\'
])

/**
 * ¿Este texto se puede enseñar como prosa con formato?
 *
 * Es lo que decide si un hueco del documento se pinta como párrafo editable o
 * como bloque de LaTeX plegado. Manda lo que hay: un `\cite` en medio de una
 * frase sigue siendo una frase; un `\begin{table}` o un `\newcommand`, no.
 */
export function isProse(latex: string): boolean {
  if (latex.trim() === '') return false
  return parseInline(latex).every(node =>
    node.kind !== 'opaque'
    || node.label === 'comentario'
    || INLINE_OK.has(node.label))
}

/** Nombre del macro que empieza en la barra de `i`, con su estrella. */
function commandName(text: string, i: number): { value: string, end: number } | null {
  let j = i + 1
  const start = j
  while (j < text.length && /[A-Za-z]/.test(text[j]!)) j++
  if (j === start) return null
  const starred = text[j] === '*'
  return { value: text.slice(start, j), end: starred ? j + 1 : j }
}
