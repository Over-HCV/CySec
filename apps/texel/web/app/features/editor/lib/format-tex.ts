/**
 * Formateador de LaTeX, deliberadamente corto de miras.
 *
 * La regla que lo gobierna todo: **no puede cambiar lo que sale en el PDF**. Por
 * eso no reordena, no junta ni parte párrafos, no toca el contenido de una línea
 * más allá de sus espacios de sobra, y deja en paz lo que hay dentro de
 * `verbatim` y compañía, donde los espacios sí se imprimen.
 *
 * Lo que hace es lo que impide que un archivo compartido se vuelva ilegible:
 * quitar espacios al final, colapsar líneas en blanco de más, indentar según el
 * anidamiento de entornos y dejar un salto de línea final.
 */

/** Dentro de estos entornos los espacios son contenido: no se tocan. */
const VERBATIM = new Set(['verbatim', 'lstlisting', 'minted', 'Verbatim', 'alltt'])

/** Estos alinean por columnas a mano; reindentarlos estropea la lectura. */
const KEEP_INDENT = new Set(['tabular', 'tabularx', 'longtable', 'array', 'matrix', 'align', 'aligned'])

const INDENT = '  '

export function formatTex(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []

  let depth = 0
  /** Entornos abiertos, para saber cuándo dejar de tocar la indentación. */
  const stack: string[] = []
  let blanks = 0

  for (const raw of lines) {
    const verbatim = stack.some(env => VERBATIM.has(env))
    if (verbatim) {
      const closing = endName(raw)
      if (closing && VERBATIM.has(closing) && stack.at(-1) === closing) {
        stack.pop()
        depth = Math.max(0, depth - 1)
        out.push(INDENT.repeat(depth) + raw.trim())
      } else {
        // Ni los espacios del final: dentro de un verbatim son contenido.
        out.push(raw)
      }
      continue
    }

    const line = raw.trim()

    if (line === '') {
      // Una línea en blanco separa párrafos en LaTeX; dos o más no separan más.
      blanks++
      if (blanks === 1 && out.length > 0) out.push('')
      continue
    }
    blanks = 0

    const closes = endName(line)
    if (closes) {
      stack.pop()
      depth = Math.max(0, depth - 1)
    }

    const frozen = stack.some(env => KEEP_INDENT.has(env))
    out.push(frozen ? raw.replace(/\s+$/, '') : INDENT.repeat(depth) + line)

    const opens = beginName(line)
    if (opens) {
      stack.push(opens)
      // `document` no indenta: si no, el archivo entero viviría a dos espacios.
      if (opens !== 'document') depth++
    }
  }

  while (out.length && out.at(-1) === '') out.pop()
  return out.length ? out.join('\n') + '\n' : ''
}

/** Nombre del entorno que abre esta línea, si abre exactamente uno. */
function beginName(line: string): string | null {
  const matches = [...line.matchAll(/\\begin\{([^}]*)\}/g)]
  const ends = [...line.matchAll(/\\end\{([^}]*)\}/g)]
  // `\begin{x}…\end{x}` en la misma línea no cambia el nivel de nada.
  if (matches.length !== 1 || ends.length > 0) return null
  if (isComment(line)) return null
  return matches[0]![1] ?? null
}

/** Nombre del entorno que cierra esta línea, si empieza cerrándolo. */
function endName(line: string): string | null {
  const match = /^\s*\\end\{([^}]*)\}/.exec(line)
  return match ? match[1]! : null
}

function isComment(line: string): boolean {
  return /^\s*%/.test(line)
}

/**
 * Parche mínimo entre dos textos: el rango que de verdad cambia, sin el prefijo
 * ni el sufijo comunes.
 *
 * Reescribir el archivo entero sería mucho más simple y mucho peor: en un
 * documento compartido, borrar e insertar todo pisa lo que otra persona tenga a
 * medio escribir en ese instante, y deja su cursor al principio. Con el parche,
 * quien esté en otro párrafo no se entera.
 */
export function minimalPatch(before: string, after: string): { from: number, remove: number, insert: string } | null {
  if (before === after) return null

  let start = 0
  const max = Math.min(before.length, after.length)
  while (start < max && before[start] === after[start]) start++

  let end = 0
  while (
    end < max - start
    && before[before.length - 1 - end] === after[after.length - 1 - end]
  ) end++

  return {
    from: start,
    remove: before.length - end - start,
    insert: after.slice(start, after.length - end)
  }
}
