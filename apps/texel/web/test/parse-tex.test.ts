import { describe, expect, it } from 'vitest'
import { parseTex } from '../app/features/visual/lib/parse-tex'
import type { Block } from '../app/features/visual/lib/types'
import { countKind, joined, joinedItems, repoFile, SECTIONS, WS01 } from './fixtures'

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

    it(`${path}: los hijos cubren el interior de su padre`, () => {
      for (const parent of blocks.filter(b => b.items)) {
        const inner = parent.items!
        const covered = joinedItems(text, parent)
        const from = inner[0]!.span.from
        const to = inner[inner.length - 1]!.span.to
        expect(covered).toBe(text.slice(from, to))
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
      for (const b of blocks.filter(b => b.kind === 'raw')) {
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

  it('lee el título y el cuerpo del caso', () => {
    const caso = blocks.find(b => b.kind === 'caso')!
    expect(value(caso, 'titulo')).toBe('Fuga de datos del portal Ashley Madison (2015)')
    expect(value(caso, 'cuerpo')!.trim())
      .toBe('Investigar sobre el caso de fuga de datos del portal Ashley Madison del 2015.')
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
      expect(value(r, 'cuerpo')!.trim()).toBe('')
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

  it('saca los cuatro \\input como bloques', () => {
    const inputs = blocks.filter(b => b.kind === 'input')
    expect(inputs).toHaveLength(5)   // meta + 4 secciones
    expect(value(inputs[1]!, 'ruta')).toBe('sections/01-confidencialidad')
  })

  it('el preámbulo y \\begin{document} quedan como raw', () => {
    const raws = blocks.filter(b => b.kind === 'raw').map(b => text.slice(b.span.from, b.span.to))
    expect(raws.some(r => r.includes('\\documentclass[es]{cysec}'))).toBe(true)
    expect(raws.some(r => r.includes('\\begin{document}'))).toBe(true)
    expect(raws.some(r => r.includes('\\printbibliography'))).toBe(true)
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

function value(block: Block, name: string): string | undefined {
  return block.fields.find(f => f.name === name)?.value
}

function walk(blocks: Block[], fn: (b: Block) => void) {
  for (const b of blocks) {
    fn(b)
    if (b.items) walk(b.items, fn)
  }
}
