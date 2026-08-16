import { describe, expect, it } from 'vitest'
import { parseTex } from '../app/features/visual/lib/parse-tex'
import type { Block } from '../app/features/visual/lib/types'
import { bodyOf, countKind, flatten, joined, joinedItems, repoFile, SECTIONS, WS01 } from './fixtures'

const FILES = [...SECTIONS, `${WS01}/main.tex`]

/** Macros y entornos del catálogo: ninguno debe sobrevivir dentro de un `raw`. */
const CATALOG = /\\(section|subsection|pregunta|porque|fuente|opcion|input)\b|\\begin\{(caso|fuentes|respuesta|mcq)\}/

describe('parseTex sobre los archivos reales de ws-01', () => {
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

describe('parseTex reconoce la estructura de 01-confidencialidad', () => {
  const text = repoFile(SECTIONS[0]!)
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
    expect(value(caso, 'titulo')).toBe('Fuga de datos del portal Ashley Madison (2015)')
    expect(bodyOf(text, caso).trim())
      .toBe('Investigar sobre el caso de fuga de datos del portal Ashley Madison del 2015.')
    expect(caso.items!.some(b => b.kind === 'raw')).toBe(true)
  })

  it('lee las 3 fuentes y deja el \\item suelto como raw', () => {
    const fuentes = blocks.find(b => b.kind === 'fuentes')!
    expect(countKind(fuentes.items!, 'fuente')).toBe(3)
    expect(value(fuentes.items!.find(b => b.kind === 'fuente')!, 'url'))
      .toBe('https://en.wikipedia.org/wiki/Ashley_Madison_data_breach')
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
    expect(value(mcq, 'enunciado')).toContain('confidencialidad como (1 o más respuestas válidas)')
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

describe('parseTex sobre main.tex', () => {
  const text = repoFile(`${WS01}/main.tex`)
  const blocks = parseTex(text)

  it('saca los cuatro \\input como bloques, dentro del documento', () => {
    const inputs = flatten(blocks).filter(b => b.kind === 'input')
    expect(inputs).toHaveLength(5)   // meta + 4 secciones
    expect(value(inputs[1]!, 'ruta')).toBe('sections/01-confidencialidad')
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

describe('parseTex sobre 04-aaa-dbir (tabla)', () => {
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

describe('parseTex en casos límite', () => {
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

describe('entornos como contenedores', () => {
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
