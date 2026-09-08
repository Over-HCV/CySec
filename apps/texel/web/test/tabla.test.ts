/**
 * El bloque de tabla.
 *
 * Sacar las tablas del cajón de `raw` es lo que más podía romper: eran el
 * ejemplo canónico de «esto se conserva entero y no se toca». Lo que se vigila
 * aquí es que siga siendo un bloque hoja —su substring es él mismo—, que las
 * celdas apunten exactamente a su texto, y que añadir, borrar y mover filas sean
 * cambios de una fila y no reescrituras de la tabla.
 */
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { parseTex } from '../app/features/visual/lib/parse-tex'
import { readGrid } from '../app/features/visual/lib/parse-table'
import { applyFieldEdit, insertRow, moveRow, parseDoc, removeRow } from '../app/features/visual/lib/doc-sync'
import { cellName, type Block } from '../app/features/visual/lib/types'
import { flatten, hasRepo, joined, repoFile, SECTIONS_02 } from './fixtures'

const TABLA = `\\begin{center}
\\small
\\begin{tabularx}{\\linewidth}{>{\\ttfamily}l X}
  \\toprule
  \\normalfont\\bfseries Opción & \\bfseries Descripción \\\\
  \\midrule
  -u URL & Objetivo de la evaluación. \\\\
  --dbs & Enumera las bases de datos. \\\\
  \\bottomrule
\\end{tabularx}
\\end{center}
`

function docWith(text: string) {
  const doc = new Y.Doc()
  const ytext = doc.getText('content')
  ytext.insert(0, text)
  return ytext
}

function tablaDe(text: string): Block {
  const found = flatten(parseTex(text)).filter(b => b.kind === 'table')
  expect(found).toHaveLength(1)
  return found[0]!
}

/** El valor de una celda, tal y como lo ve la interfaz. */
function celda(block: Block, row: number, col: number): string | undefined {
  return block.fields.find(f => f.name === cellName(row, col))?.value
}

describe('parseo de una tabla', () => {
  const tabla = tablaDe(TABLA)

  it('la partición sigue cubriendo el archivo y la tabla es una hoja', () => {
    expect(joined(TABLA, parseTex(TABLA))).toBe(TABLA)
    expect(tabla.items).toBeUndefined()
  })

  it('el `center` que la envuelve ya no es un muro: es un contenedor', () => {
    const centro = parseTex(TABLA)[0]!
    expect(centro.kind).toBe('env')
    expect(centro.meta!.env).toBe('center')
  })

  it('cuenta las columnas y las filas con celdas', () => {
    expect(tabla.meta!.table!.cols).toBe(2)
    expect(tabla.meta!.table!.rows.filter(r => r.cells.length).length).toBe(3)
  })

  it('las celdas llevan solo su texto, sin el `&` ni el `\\\\`', () => {
    expect(celda(tabla, 0, 0)).toBe('\\normalfont\\bfseries Opción')
    expect(celda(tabla, 0, 1)).toBe('\\bfseries Descripción')
    expect(celda(tabla, 1, 0)).toBe('-u URL')
    expect(celda(tabla, 2, 1)).toBe('Enumera las bases de datos.')
  })

  it('cada span de celda apunta exactamente a su valor', () => {
    for (const f of tabla.fields) {
      expect(TABLA.slice(f.span.from, f.span.to)).toBe(f.value)
    }
  })

  it('las reglas no son celdas: van pegadas a la fila que abren', () => {
    const rows = tabla.meta!.table!.rows
    expect(rows[0]!.rule).toBe('\\toprule')
    expect(rows[1]!.rule).toBe('\\midrule')
    expect(rows.at(-1)!.rule).toBe('\\bottomrule')
    expect(rows.at(-1)!.cells).toHaveLength(0)
  })

  it('el ancho y las columnas son campos, no texto perdido', () => {
    expect(tabla.fields.find(f => f.name === 'ancho')!.value).toBe('\\linewidth')
    expect(tabla.fields.find(f => f.name === 'columnas')!.value).toBe('>{\\ttfamily}l X')
  })

  it('un `tabular` con posición opcional también se lee', () => {
    const s = '\\begin{tabular}[t]{ll}\n  a & b \\\\\n\\end{tabular}\n'
    const tabla = tablaDe(s)
    expect(tabla.fields.find(f => f.name === 'columnas')!.value).toBe('ll')
    expect(celda(tabla, 0, 1)).toBe('b')
    expect(joined(s, parseTex(s))).toBe(s)
  })

  it('un `&` escapado no parte la celda', () => {
    const s = '\\begin{tabular}{l}\n  Ana \\& Juan \\\\\n\\end{tabular}\n'
    expect(celda(tablaDe(s), 0, 0)).toBe('Ana \\& Juan')
  })

  it('sin una sola celda no hay rejilla: se conserva entero como antes', () => {
    const s = '\\begin{tabular}{l}\n\\end{tabular}\n'
    expect(parseTex(s)[0]!.kind).toBe('raw')
    expect(readGrid('\n', 0, 1)).toBeNull()
  })
})

describe('editar una tabla', () => {
  it('escribir en una celda toca esa celda y nada más', () => {
    const ytext = docWith(TABLA)
    const tabla = flatten(parseDoc(ytext.toString(), 'tex')).find(b => b.kind === 'table')!
    const field = tabla.fields.find(f => f.name === cellName(1, 1))!
    expect(applyFieldEdit(ytext, field, 'Otra descripción.')).toBeNull()
    expect(ytext.toString()).toBe(TABLA.replace('Objetivo de la evaluación.', 'Otra descripción.'))
  })

  it('añadir una fila la deja debajo de la regla, con sus columnas', () => {
    const ytext = docWith(TABLA)
    const tabla = flatten(parseDoc(ytext.toString(), 'tex')).find(b => b.kind === 'table')!
    // Detrás de la última fila con celdas: la posición que ofrece «Añadir fila».
    expect(insertRow(ytext, tabla, 3, ytext.toString())).toBeNull()

    const despues = tablaDe(ytext.toString())
    expect(despues.meta!.table!.rows.filter(r => r.cells.length).length).toBe(4)
    // Y el `\bottomrule` sigue cerrando la tabla, no ha quedado en medio.
    expect(despues.meta!.table!.rows.at(-1)!.rule).toBe('\\bottomrule')
    expect(joined(ytext.toString(), parseTex(ytext.toString()))).toBe(ytext.toString())
  })

  it('borrar una fila no se lleva la regla que la abría', () => {
    const ytext = docWith(TABLA)
    const tabla = flatten(parseDoc(ytext.toString(), 'tex')).find(b => b.kind === 'table')!
    // La fila 1 es la primera del cuerpo, la que abre el `\midrule`.
    expect(removeRow(ytext, tabla, 1, ytext.toString())).toBeNull()
    expect(ytext.toString()).toContain('\\midrule')
    expect(ytext.toString()).not.toContain('-u URL')
    // Y la regla se queda en su línea: el salto que la separaba de la fila
    // borrada iba dentro de lo borrado y hay que reponerlo.
    expect(ytext.toString()).toContain('\\midrule\n  --dbs')
    expect(tablaDe(ytext.toString()).meta!.table!.rows.filter(r => r.cells.length).length).toBe(2)
  })

  it('mover una fila es una permutación: ni se gana ni se pierde texto', () => {
    const ytext = docWith(TABLA)
    const tabla = flatten(parseDoc(ytext.toString(), 'tex')).find(b => b.kind === 'table')!
    expect(moveRow(ytext, tabla, 2, -1, ytext.toString())).toBeNull()

    const despues = ytext.toString()
    expect(despues.length).toBe(TABLA.length)
    expect([...despues].sort().join('')).toBe([...TABLA].sort().join(''))
    expect(despues.indexOf('--dbs')).toBeLessThan(despues.indexOf('-u URL'))
    // Y las reglas siguen en su sitio: el cuerpo empieza tras el `\midrule`.
    expect(despues.indexOf('\\midrule')).toBeLessThan(despues.indexOf('--dbs'))
  })
})

describe.skipIf(!hasRepo)('las tablas reales del ws-02', () => {
  for (const path of SECTIONS_02) {
    const text = repoFile(path)
    const blocks = parseTex(text)

    it(`${path}: cada tabla es una hoja con todas sus celdas apuntadas`, () => {
      for (const tabla of flatten(blocks).filter(b => b.kind === 'table')) {
        expect(tabla.items).toBeUndefined()
        expect(tabla.meta!.table!.cols).toBeGreaterThan(0)
        for (const f of tabla.fields) {
          expect(text.slice(f.span.from, f.span.to)).toBe(f.value)
        }
      }
    })

    it(`${path}: ningún raw esconde ya un tabular`, () => {
      for (const block of flatten(blocks).filter(b => b.kind === 'raw')) {
        const src = text.slice(block.span.from, block.span.to)
        expect(src).not.toMatch(/\\begin\{tabularx?\}/)
      }
    })
  }
})
