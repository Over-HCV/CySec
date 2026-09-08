/**
 * Parseo del log de LaTeX a diagnósticos.
 *
 * Se compila siempre con `-file-line-error`, así que los errores llegan como
 * `ruta/archivo.tex:123: mensaje`, que es lo fácil. Los warnings no respetan ese
 * formato y hay que reconocerlos por sus prefijos.
 */
export interface Diagnostic {
  file: string
  line: number | null
  level: 'error' | 'warning' | 'info'
  message: string
}

/**
 * `-file-line-error` escribe `ruta/archivo.tex:123: mensaje`. El nombre no
 * puede llevar espacios y termina en extensión: sin esa exigencia, cualquier
 * línea con `algo:1234:` pasaba por un error, y el volcado del perfil ICC que
 * xdvipdfmx escribe al incrustar un PNG —`pdf_color>> Creation Date: 2016:01:00…`—
 * aparecía como tres errores en cada compilación con imágenes.
 */
const FILE_LINE_ERROR = /^([^\s:]+\.[A-Za-z]{1,5}):(\d+):\s*(.+)$/

/**
 * Ancho al que TeX parte las líneas del `.log` (`max_print_line`). Una línea de
 * exactamente ese largo viene cortada a media palabra —«…más recient» / «e on
 * input line 137.»—, así que su continuación se pega **sin** espacio; las demás
 * son líneas de verdad y sí lo llevan.
 */
const WRAP = 79

/** Pega la continuación de una línea del log, con espacio o sin él. */
function join(message: string, previous: string, next: string): string {
  return previous.length >= WRAP
    ? message + next.replace(/\s+$/, '')
    : `${message} ${next.trim()}`
}
const LATEX_WARNING = /^(?:LaTeX|Package|Class)\s*(?:(\S+)\s*)?Warning:\s*(.+)$/
const ON_INPUT_LINE = /on input line (\d+)/
const MISSING_REF = /Reference `([^']+)' on page \d+ undefined/

// biber no escribe en el .log de LaTeX: sus errores solo salen por la salida de
// latexmk. Sin esto, un .bib que no se encuentra deja la bibliografía como
// estuviera y no aparece nada en el panel de problemas.
const BIBER_ERROR = /^(?:\[\d+\] )?(?:.*> )?(?:ERROR|FATAL) - (.+)$/

/**
 * Error de TeX sin archivo ni línea: `! Emergency stop.`, `! File ended while
 * scanning…`. `-file-line-error` los imprime con `archivo:línea:` **cuando sabe
 * dónde está**; los que revientan al final de un archivo, o dentro de la
 * expansión de una macro, salen así. Sin esto una compilación abortada
 * enseñaba cero problemas, que es peor que no enseñar nada.
 */
const BARE_ERROR = /^! (.+)$/
const RERUN_BIBER = /Please \(re\)run Biber on the file/

export function parseLog(log: string, workdir: string): Diagnostic[] {
  const out: Diagnostic[] = []
  const lines = log.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''

    // Errores con -file-line-error
    const err = FILE_LINE_ERROR.exec(line)
    if (err && !line.startsWith('Latexmk')) {
      const [, file, num, message] = err
      // El log corta a 79 columnas: la continuación va en la línea siguiente.
      const cont = lines[i + 1] ?? ''
      out.push({
        file: relativize(file!, workdir),
        line: Number(num),
        level: 'error',
        message: cont.trim() && !cont.trim().startsWith('!')
          ? join(message!, line, cont).trim()
          : message!.trim()
      })
      continue
    }

    // Warnings de LaTeX / paquetes / clases (pueden ocupar varias líneas)
    const warn = LATEX_WARNING.exec(line)
    if (warn) {
      const [, source, text] = warn
      let message = text!.trim()
      let j = i + 1
      while (j < lines.length && lines[j]?.startsWith('(') === false && lines[j]?.trim()) {
        message = join(message, lines[j - 1] ?? '', lines[j]!)
        j++
        if (j - i > 3) break
      }
      const at = ON_INPUT_LINE.exec(message)
      out.push({
        file: '',
        line: at ? Number(at[1]) : null,
        level: 'warning',
        message: source ? `${source}: ${message}` : message
      })
      continue
    }

    // Referencias sin resolver: útiles como aviso aparte
    const ref = MISSING_REF.exec(line)
    if (ref) {
      out.push({ file: '', line: null, level: 'warning', message: `Referencia sin resolver: ${ref[1]}` })
      continue
    }

    // Bibliografía: un fallo de biber deja el documento con las referencias de
    // la compilación anterior, así que tiene que verse como error.
    const biber = BIBER_ERROR.exec(line)
    if (biber) {
      out.push({ file: '', line: null, level: 'error', message: `Bibliografía (biber): ${biber[1]!.trim()}` })
      continue
    }

    const bare = BARE_ERROR.exec(line)
    if (bare) {
      const cont = lines[i + 1] ?? ''
      out.push({
        file: '',
        line: null,
        level: 'error',
        message: cont.trim() && !cont.trim().startsWith('!')
          ? join(bare[1]!, line, cont).trim()
          : bare[1]!.trim()
      })
      continue
    }

    if (RERUN_BIBER.test(line)) {
      out.push({
        file: '',
        line: null,
        level: 'warning',
        message: 'La bibliografía está sin rehacer: compila en modo normal o usa «Recompilar desde cero».'
      })
    }
  }

  return dedupe(out)
}

/** Rutas absolutas del contenedor → rutas del proyecto. */
function relativize(file: string, workdir: string): string {
  return file.replace(`${workdir}/`, '').replace(/^\.\//, '')
}

function dedupe(items: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>()
  return items.filter((d) => {
    const key = `${d.level}|${d.file}|${d.line}|${d.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
