import { describe, expect, it } from 'vitest'
import { parseTex } from '../app/features/visual/lib/parse-tex'
import type { Block } from '../app/features/visual/lib/types'
import {
  bodyOf, countKind, flatten, hasRepo, joined, joinedItems, repoFile,
  SAMPLE_MAIN, SAMPLE_TEX, SECTIONS, WS01
} from './fixtures'

/** Cuántas veces aparece algo en el propio archivo, para no congelar cifras. */
function occurrences(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0
}

const FILES = [...SECTIONS, `${WS01}/main.tex`]

/** Macros y entornos del catálogo: ninguno debe sobrevivir dentro de un `raw`. */
const CATALOG = /\\(section|subsection|pregunta|porque|fuente|opcion|input)\b|\\begin\{(caso|fuentes|respuesta|mcq)\}/

describe.skipIf(!hasRepo)('parseTex sobre los archivos reales de ws-01', () => {
  for (const path of FILES) {
    const text = repoFile(path)
    const blocks = parseTex(text)

    it(`${path}: los bloques cubren el archivo entero`, () => {
      expect(joined(text, blocks)).toBe(text)
    })

    it(`${path}: los hijos cubren el cuerpo de su padre, a cualquier profundidad`, () => {
      for (const parent of flatten(blocks).filter(b => b.items)) {
        expect(joinedItems(text, parent)).toBe(bodyOf(text, parent))
      }
    })

    it(`${path}: el texto de un párrafo no arrastra los saltos que lo separan`, () => {
      // El bloque sí los abarca —la partición del archivo no se toca—, pero lo
      // editable es el texto. Si se cuelan, el campo se pinta con una línea en
      // blanco delante y el navegador se la come al tocar el borde.
      for (const block of flatten(blocks).filter(b => b.kind === 'paragraph')) {
        const campo = block.fields[0]!
        expect(campo.value).toBe(campo.value.trim())
        expect(campo.value).not.toBe('')
        expect(text.slice(campo.span.from, campo.span.to)).toBe(campo.value)
        expect(campo.span.from).toBeGreaterThanOrEqual(block.span.from)
        expect(campo.span.to).toBeLessThanOrEqual(block.span.to)
      }
    })

    it(`${path}: cada span de campo apunta exactamente a su valor`, () => {
      walk(blocks, (b) => {
        for (const f of b.fields) {
          expect(text.slice(f.span.from, f.span.to)).toBe(f.value)
        }
      })
    })

    it(`${path}: ningún bloque raw esconde una macro del catálogo`, () => {
      // Las macros dentro de un `\porque` no cuentan: están en el campo de un
      // bloque reconocido, no sueltas. Por eso solo se miran los `raw`.
      for (const b of flatten(blocks).filter(b => b.kind === 'raw')) {
        const src = text.slice(b.span.from, b.span.to)
        // Los entornos opacos (tablas) sí son raw a propósito.
        if (/\\begin\{(table|tabularx|tabular)\}/.test(src)) continue
        expect(src, `raw inesperado en ${path}: ${JSON.stringify(src.slice(0, 80))}`)
          .not.toMatch(CATALOG)
      }
    })
  }
})

// Sobre el taller escrito, no sobre el de verdad: un taller se contesta, y las
// cifras de hoy —tres fuentes, ninguna opción marcada— no son las de mañana.
// Aquí se prueba que el escáner reconoce cada construcción; que sigue
// entendiendo lo que hay escrito de verdad lo prueban los invariantes de
// arriba y las cuentas derivadas de más abajo.
describe('parseTex reconoce cada construcción del catálogo', () => {
  const text = SAMPLE_TEX
  const blocks = parseTex(text)

  it('cuenta los bloques esperados', () => {
    expect(countKind(blocks, 'section')).toBe(2)   // \section + \subsection*
    expect(countKind(blocks, 'caso')).toBe(1)
    expect(countKind(blocks, 'fuentes')).toBe(1)
    expect(countKind(blocks, 'pregunta')).toBe(3)
    expect(countKind(blocks, 'respuesta')).toBe(3)
    expect(countKind(blocks, 'mcq')).toBe(1)
    expect(countKind(blocks, 'porque')).toBe(1)
  })

  it('lee el título del caso y su cuerpo queda dentro, como hijos', () => {
    const caso = blocks.find(b => b.kind === 'caso')!
    expect(value(caso, 'titulo')).toBe('Un caso de ejemplo (2015)')
    expect(bodyOf(text, caso).trim())
      .toBe('Investigar el caso de ejemplo y responder a las preguntas de abajo.')
    // El enunciado es prosa, así que entra como párrafo editable y no como
    // LaTeX crudo: es lo que lee quien no sabe LaTeX.
    expect(caso.items!.some(b => b.kind === 'paragraph')).toBe(true)
  })

  it('lee las 3 fuentes y deja el \\item suelto como raw', () => {
    const fuentes = blocks.find(b => b.kind === 'fuentes')!
    expect(countKind(fuentes.items!, 'fuente')).toBe(3)
    expect(value(fuentes.items!.find(b => b.kind === 'fuente')!, 'url'))
      .toBe('https://ejemplo.org/primera')
    expect(fuentes.items!.some(b =>
      b.kind === 'raw' && text.slice(b.span.from, b.span.to).includes('\\item'))).toBe(true)
  })

  it('las tres respuestas están vacías (borrador)', () => {
    for (const r of blocks.filter(b => b.kind === 'respuesta')) {
      expect(bodyOf(text, r).trim()).toBe('')
      expect(r.items!.every(b => b.flags?.blank)).toBe(true)
    }
  })

  it('lee el mcq multilínea con sus 4 opciones, ninguna correcta', () => {
    const mcq = blocks.find(b => b.kind === 'mcq')!
    expect(value(mcq, 'enunciado')).toContain('que ocupa\n  más de una línea')
    const opciones = mcq.items!.filter(b => b.kind === 'opcion')
    expect(opciones).toHaveLength(4)
    expect(opciones.every(o => o.flags?.correcta === false)).toBe(true)
  })

  it('la subsección estrellada se marca como tal', () => {
    const subs = blocks.filter(b => b.kind === 'section')
    expect(subs[0]!.meta!.nivel).toBe(1)
    expect(subs[0]!.flags!.starred).toBe(false)
    expect(subs[1]!.meta!.nivel).toBe(2)
    expect(subs[1]!.flags!.starred).toBe(true)
  })

  it('la nota de borrador conserva sus dos argumentos', () => {
    const porque = blocks.find(b => b.kind === 'porque')!
    expect(value(porque, 'titulo')).toBe('verificar contra las diapositivas')
    expect(value(porque, 'texto')).toContain('\\texttt{\\textbackslash opcion*}')
  })
})

// Las cuentas salen del propio archivo: si el escáner deja de ver una pregunta
// que está escrita, esto lo dice, y contestar el taller no rompe nada.
describe.skipIf(!hasRepo)('parseTex sigue el ws-01 que hay escrito ahora', () => {
  const text = repoFile(SECTIONS[0]!)
  const blocks = parseTex(text)
  const flat = flatten(blocks)

  it('ve tantas preguntas, respuestas y opciones como hay en el archivo', () => {
    expect(countKind(blocks, 'pregunta')).toBe(occurrences(text, /\\pregunta\{/g))
    expect(countKind(blocks, 'respuesta')).toBe(occurrences(text, /\\begin\{respuesta\}/g))
    expect(flat.filter(b => b.kind === 'opcion')).toHaveLength(occurrences(text, /^\s*\\opcion\*?\{/gm))
    expect(countKind(blocks, 'mcq')).toBe(occurrences(text, /\\begin\{mcq\}/g))
  })

  it('las opciones marcadas en el archivo salen marcadas', () => {
    const marcadas = flat.filter(b => b.kind === 'opcion' && b.flags?.correcta)
    expect(marcadas).toHaveLength(occurrences(text, /\\opcion\*\{/g))
  })

  it('una respuesta escrita no se marca como pendiente', () => {
    for (const respuesta of blocks.filter(b => b.kind === 'respuesta')) {
      const vacia = bodyOf(text, respuesta).trim() === ''
      expect(respuesta.items!.every(b => b.flags?.blank)).toBe(vacia)
    }
  })
})

describe.skipIf(!hasRepo)('parseTex sobre main.tex', () => {
  const text = repoFile(`${WS01}/main.tex`)
  const blocks = parseTex(text)

  it('saca todos los \\input como bloques, dentro del documento', () => {
    // Tantos como haya escritos: el taller gana secciones según se escribe.
    const inputs = flatten(blocks).filter(b => b.kind === 'input')
    expect(inputs).toHaveLength(occurrences(text, /\\input\{/g))
    expect(inputs.map(b => value(b, 'ruta'))).toContain('sections/01-confidencialidad')
  })

  it('\\begin{document} … \\end{document} es un solo bloque contenedor', () => {
    const doc = blocks.find(b => b.kind === 'env' && b.meta!.env === 'document')!
    expect(doc).toBeDefined()
    const src = text.slice(doc.span.from, doc.span.to)
    expect(src.startsWith('\\begin{document}')).toBe(true)
    expect(src.trimEnd().endsWith('\\end{document}')).toBe(true)
    // Los `\input` y el `\printbibliography` viven dentro, no al lado.
    expect(doc.items!.some(b => b.kind === 'input')).toBe(true)
    expect(bodyOf(text, doc)).toContain('\\printbibliography')
    // Y ya no hay ningún raw suelto con el delimitador.
    expect(flatten(blocks).some(b =>
      b.kind === 'raw' && text.slice(b.span.from, b.span.to).includes('\\begin{document}'))).toBe(false)
  })

  it('el preámbulo se agrupa en un bloque plegable', () => {
    expect(blocks[0]!.kind).toBe('preamble')
    expect(blocks[1]!.kind).toBe('env')
    expect(text.slice(blocks[0]!.span.from, blocks[0]!.span.to))
      .toContain('\\documentclass[es]{cysec}')
    expect(blocks[0]!.span.from).toBe(0)
    expect(blocks[0]!.span.to).toBe(blocks[1]!.span.from)
  })
})

describe.skipIf(!hasRepo)('parseTex sobre 04-aaa-dbir (tabla)', () => {
  const text = repoFile(SECTIONS[3]!)
  const blocks = parseTex(text)

  it('mantiene la tabla entera en un solo raw', () => {
    const tabla = blocks.find(b =>
      b.kind === 'raw' && text.slice(b.span.from, b.span.to).includes('\\begin{table}'))
    expect(tabla).toBeDefined()
    const src = text.slice(tabla!.span.from, tabla!.span.to)
    expect(src).toContain('\\end{table}')
    expect(src).toContain('\\bottomrule')
  })

  it('encuentra las dos secciones del archivo', () => {
    expect(blocks.filter(b => b.kind === 'section' && b.meta!.nivel === 1)).toHaveLength(2)
  })
})

describe.skipIf(!hasRepo)('parseTex en casos límite', () => {
  it('cubre el texto entero pase lo que pase', () => {
    const samples = [
      '',
      '\n\n',
      'prosa suelta\n',
      '\\begin{caso}{sin cerrar}\ncuerpo\n',
      '\\pregunta{sin cerrar\n',
      '\\porque{solo un argumento}\n',
      '\\section{a}\\section*{b}\n',
      '% \\pregunta{comentada}\n\\pregunta{real}\n',
      '\\opcion*{correcta}\n',
      '\\fuente{https://x.com/a%20b}\n'
    ]
    for (const s of samples) {
      expect(joined(s, parseTex(s)), JSON.stringify(s)).toBe(s)
    }
  })

  it('una macro comentada no se reconoce', () => {
    const s = '% \\pregunta{comentada}\n\\pregunta{real}\n'
    const blocks = parseTex(s)
    expect(countKind(blocks, 'pregunta')).toBe(1)
    expect(value(blocks.find(b => b.kind === 'pregunta')!, 'enunciado')).toBe('real')
  })

  it('un entorno sin cerrar no se traga el archivo', () => {
    const s = '\\begin{caso}{sin cerrar}\ncuerpo\n'
    expect(countKind(parseTex(s), 'caso')).toBe(0)
  })

  it('\\opcion* se marca como correcta', () => {
    const s = '\\begin{mcq}{p}\n  \\opcion{no}\n  \\opcion*{sí}\n\\end{mcq}\n'
    const opciones = parseTex(s).find(b => b.kind === 'mcq')!.items!.filter(b => b.kind === 'opcion')
    expect(opciones.map(o => o.flags!.correcta)).toEqual([false, true])
  })

  it('respeta las llaves escapadas', () => {
    const s = '\\pregunta{una llave \\{ y otra \\} dentro}\n'
    expect(value(parseTex(s)[0]!, 'enunciado')).toBe('una llave \\{ y otra \\} dentro')
  })

  it('un argumento no cruza una línea en blanco', () => {
    const s = '\\pregunta\n\n{esto no es su argumento}\n'
    expect(countKind(parseTex(s), 'pregunta')).toBe(0)
  })
})

describe.skipIf(!hasRepo)('entornos como contenedores', () => {
  it('un entorno cualquiera se convierte en un bloque con hijos', () => {
    const s = '\\begin{itemize}\n\\item uno\n\\end{itemize}\n'
    const [env] = parseTex(s)
    expect(env!.kind).toBe('env')
    expect(env!.meta!.env).toBe('itemize')
    expect(s.slice(env!.meta!.bodyFrom!, env!.meta!.bodyTo!)).toBe('\n\\item uno\n')
    expect(joined(s, parseTex(s))).toBe(s)
  })

  it('los argumentos de la misma línea son campos', () => {
    const s = '\\begin{mio}{uno}{dos}\ncuerpo\n\\end{mio}\n'
    const [env] = parseTex(s)
    expect(env!.fields.map(f => f.value)).toEqual(['uno', 'dos'])
    expect(s.slice(env!.meta!.bodyFrom!, env!.meta!.bodyTo!)).toBe('\ncuerpo\n')
  })

  it('un grupo en la línea siguiente es cuerpo, no argumento', () => {
    const s = '\\begin{mio}\n{esto es contenido}\n\\end{mio}\n'
    const [env] = parseTex(s)
    expect(env!.fields).toHaveLength(0)
    expect(s.slice(env!.meta!.bodyFrom!, env!.meta!.bodyTo!)).toBe('\n{esto es contenido}\n')
  })

  it('el nombre del \\begin y el del \\end se localizan por separado', () => {
    const s = '\\begin{mio}\nx\n\\end{mio}\n'
    const env = parseTex(s)[0]!
    expect(s.slice(env.meta!.nameFrom!, env.meta!.nameTo!)).toBe('mio')
    expect(s.slice(env.meta!.endNameFrom!, env.meta!.endNameTo!)).toBe('mio')
    expect(env.meta!.endNameFrom!).toBeGreaterThan(env.meta!.nameTo!)
  })

  it('entornos anidados del mismo nombre no se confunden', () => {
    const s = '\\begin{mio}\n\\begin{mio}\ndentro\n\\end{mio}\n\\end{mio}\n'
    const fuera = parseTex(s)[0]!
    const dentro = fuera.items!.find(b => b.kind === 'env')!
    expect(s.slice(fuera.span.from, fuera.span.to)).toBe(s.trimEnd())
    expect(s.slice(dentro.meta!.bodyFrom!, dentro.meta!.bodyTo!)).toBe('\ndentro\n')
  })

  it('un entorno sin cerrar sigue sin reconocerse', () => {
    const s = '\\begin{mio}\ncuerpo\n'
    expect(countKind(parseTex(s), 'env')).toBe(0)
    expect(joined(s, parseTex(s))).toBe(s)
  })

  it('un entorno opaco sigue entero como raw', () => {
    const s = '\\begin{tabular}{ll}\na & b \\\\\n\\end{tabular}\n'
    const [tabla] = parseTex(s)
    expect(tabla!.kind).toBe('raw')
    expect(tabla!.items).toBeUndefined()
  })

  it('sin \\begin{document} no se agrupa preámbulo', () => {
    const s = '\\section{a}\n\ntexto\n'
    expect(countKind(parseTex(s), 'preamble')).toBe(0)
  })

  it('la partición se conserva con contenedores anidados', () => {
    const samples = [
      '\\begin{document}\n\\begin{caso}{t}\ncuerpo\n\\end{caso}\n\\end{document}\n',
      '\\documentclass{article}\n\\begin{document}\nHola.\n\\end{document}\n',
      '\\begin{mio}{a}\n\\begin{otro}\n\\end{otro}\n\\end{mio}\n',
      '\\begin{document}\\end{document}',
      '\\begin{document}\n\\end{document}\n% cola\n'
    ]
    for (const s of samples) {
      const blocks = parseTex(s)
      expect(joined(s, blocks), JSON.stringify(s)).toBe(s)
      for (const parent of flatten(blocks).filter(b => b.items)) {
        expect(joinedItems(s, parent)).toBe(bodyOf(s, parent))
      }
    }
  })
})

function value(block: Block, name: string): string | undefined {
  return block.fields.find(f => f.name === name)?.value
}

function walk(blocks: Block[], fn: (b: Block) => void) {
  for (const b of blocks) {
    fn(b)
    if (b.items) walk(b.items, fn)
  }
}

describe.skipIf(!hasRepo)('macros con nombre, en vez de código', () => {
  it('\\makewsheader y \\printbibliography dejan de ser LaTeX crudo', () => {
    const text = repoFile(`${WS01}/main.tex`)
    const atoms = flatten(parseTex(text)).filter(b => b.kind === 'atom')
    const cmds = atoms.map(b => b.meta!.cmd)

    expect(cmds).toContain('makewsheader')
    expect(cmds).toContain('printbibliography')
    // Y ya no queda ningún raw con ellos dentro.
    expect(flatten(parseTex(text)).some(b =>
      b.kind === 'raw' && text.slice(b.span.from, b.span.to).includes('\\makewsheader'))).toBe(false)
  })

  it('\\printbibliography se queda con su argumento opcional', () => {
    const s = '\\printbibliography[title={Referencias}]\n'
    const [atom] = parseTex(s)
    expect(atom!.kind).toBe('atom')
    expect(s.slice(atom!.span.from, atom!.span.to)).toBe('\\printbibliography[title={Referencias}]')
  })

  it('los datos del taller se agrupan y son campos', () => {
    const meta = parseTex(repoFile(`${WS01}/meta.tex`)).find(b => b.kind === 'meta')!
    const campos = meta.items!.filter(b => b.kind === 'atom')
      .map(b => [b.meta!.cmd, b.fields[0]!.value])

    expect(campos).toContainEqual(['wstitle', 'Introducción a ciberseguridad I'])
    expect(campos).toContainEqual(['wsauthor', 'Over Haider Castrillón Valencia'])
  })

  it('la prosa suelta es párrafo, no LaTeX crudo', () => {
    const blocks = flatten(parseTex(repoFile(SECTIONS[0]!)))
    const parrafos = blocks.filter(b => b.kind === 'paragraph')
    expect(parrafos.length).toBeGreaterThan(0)
    expect(parrafos.every(b => b.fields.length === 1 && b.fields[0]!.name === 'texto')).toBe(true)
  })

  it('un macro conocido sin cerrar se marca en vez de quedarse mudo', () => {
    const s = '\\porque{cómo usar}{%\n  Texto sin cerrar.\n'
    const roto = parseTex(s).find(b => b.flags?.broken)
    expect(roto).toBeDefined()
    expect(roto!.meta!.cmd).toBe('porque')
  })

  it('la partición y los campos siguen cuadrando con los tipos nuevos', () => {
    for (const path of [...SECTIONS, `${WS01}/main.tex`, `${WS01}/meta.tex`]) {
      const text = repoFile(path)
      const blocks = parseTex(text)
      expect(joined(text, blocks), path).toBe(text)
      for (const block of flatten(blocks)) {
        for (const f of block.fields) {
          expect(text.slice(f.span.from, f.span.to)).toBe(f.value)
        }
      }
    }
  })
})

describe.skipIf(!hasRepo)('avisos falsos de «sin cerrar»', () => {
  it('un macro nombrado dentro de un comentario no cuenta', () => {
    const s = '%% La capa vive en tex/; \\input{common/...} resuelve desde ws-XX.\n\\NeedsTeXFormat{LaTeX2e}\n'
    expect(parseTex(s).some(b => b.flags?.broken)).toBe(false)
  })

  it('definir un macro no es usarlo', () => {
    const s = '\\newcommand{\\wsnumber}[1]{\\renewcommand{\\ws@number}{#1}}\n'
    expect(parseTex(s).some(b => b.flags?.broken)).toBe(false)
  })

  it('pero un macro de verdad sin cerrar sí avisa', () => {
    const s = '\\pregunta{sin cerrar\n\ny más texto\n'
    expect(parseTex(s).some(b => b.flags?.broken)).toBe(true)
  })

  it('un tramo de solo comentarios se marca como nota', () => {
    const s = '% ===== Preguntas abiertas =====\n'
    expect(parseTex(s)[0]!.flags?.comment).toBe(true)
  })
})

describe.skipIf(!hasRepo)('el aviso solo salta cuando el macro abre la línea', () => {
  it('un nombre usado como argumento de otra macro no cuenta', () => {
    const s = '\\RequirePackage{titlesec}\n\\titleformat{\\section}{\\large\\bfseries}{}{0pt}{}\n'
    expect(parseTex(s).some(b => b.flags?.broken)).toBe(false)
  })

  it('el de verdad sigue avisando', () => {
    expect(parseTex('\\porque{a}{b sin cerrar\n\notra cosa\n').some(b => b.flags?.broken)).toBe(true)
  })
})
