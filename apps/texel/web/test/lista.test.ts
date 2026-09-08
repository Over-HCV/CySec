/**
 * Listas: `itemize`, `enumerate` y `description`.
 *
 * `\item` es la única macro del catálogo sin argumento entre llaves —lo que
 * lleva dentro llega hasta el próximo `\item`—, así que lo que se vigila aquí es
 * que los elementos particionen el cuerpo de la lista y que el campo editable
 * sea el texto y solo el texto.
 */
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { parseTex } from '../app/features/visual/lib/parse-tex'
import { applyFieldEdit, parseDoc } from '../app/features/visual/lib/doc-sync'
import { childKind } from '../app/features/visual/lib/catalog'
import type { Block } from '../app/features/visual/lib/types'
import { bodyOf, flatten, hasRepo, joined, joinedItems, repoFile, SECTIONS_02 } from './fixtures'

const LISTA = `Sobre estas dos:

\\begin{itemize}
  \\item \\url{http://testphp.vulnweb.com/listproducts.php?cat=1}
  \\item La segunda, con \\textbf{negrita} dentro.
\\end{itemize}

Y un párrafo detrás.
`

function lista(text: string): Block {
  const found = flatten(parseTex(text)).filter(b => b.kind === 'lista')
  expect(found).toHaveLength(1)
  return found[0]!
}

describe('parseo de una lista', () => {
  it('es un bloque propio, no un entorno cualquiera lleno de LaTeX', () => {
    const block = lista(LISTA)
    expect(block.meta!.env).toBe('itemize')
    expect(joined(LISTA, parseTex(LISTA))).toBe(LISTA)
  })

  it('cada `\\item` es un hijo y los hijos cubren el cuerpo entero', () => {
    const block = lista(LISTA)
    expect(block.items!.filter(b => b.kind === 'item')).toHaveLength(2)
    expect(joinedItems(LISTA, block)).toBe(bodyOf(LISTA, block))
  })

  it('el campo es el texto: sin el `\\item`, sin la sangría y sin el salto', () => {
    const [uno, dos] = lista(LISTA).items!.filter(b => b.kind === 'item')
    expect(uno!.fields.find(f => f.name === 'texto')!.value)
      .toBe('\\url{http://testphp.vulnweb.com/listproducts.php?cat=1}')
    expect(dos!.fields.find(f => f.name === 'texto')!.value)
      .toBe('La segunda, con \\textbf{negrita} dentro.')
    for (const item of lista(LISTA).items!.filter(b => b.kind === 'item')) {
      for (const f of item.fields) {
        expect(LISTA.slice(f.span.from, f.span.to)).toBe(f.value)
      }
    }
  })

  it('escribir en un elemento toca ese elemento y nada más', () => {
    const doc = new Y.Doc()
    const ytext = doc.getText('content')
    ytext.insert(0, LISTA)
    const item = flatten(parseDoc(ytext.toString(), 'tex'))
      .filter(b => b.kind === 'item')[1]!
    const campo = item.fields.find(f => f.name === 'texto')!
    expect(applyFieldEdit(ytext, campo, 'La segunda, ya cambiada.')).toBeNull()
    expect(ytext.toString())
      .toBe(LISTA.replace('La segunda, con \\textbf{negrita} dentro.', 'La segunda, ya cambiada.'))
  })

  it('`enumerate` y `description` van por el mismo camino', () => {
    const numerada = '\\begin{enumerate}\n  \\item uno\n  \\item dos\n\\end{enumerate}\n'
    expect(lista(numerada).items!.filter(b => b.kind === 'item')).toHaveLength(2)

    const descrita = '\\begin{description}\n  \\item[Primero] su explicación.\n\\end{description}\n'
    const item = lista(descrita).items!.find(b => b.kind === 'item')!
    expect(item.fields.map(f => [f.name, f.value]))
      .toEqual([['etiqueta', 'Primero'], ['texto', 'su explicación.']])
    expect(joined(descrita, parseTex(descrita))).toBe(descrita)
  })

  it('una lista con un entorno dentro se queda como contenedor genérico', () => {
    // Una lista anidada o una imagen no caben en un campo de texto; antes que
    // enseñarlo a medias, se conserva lo que ya se hacía.
    const anidada = '\\begin{itemize}\n  \\item uno\n  \\item \\begin{center}foto\\end{center}\n\\end{itemize}\n'
    expect(flatten(parseTex(anidada)).filter(b => b.kind === 'lista')).toHaveLength(0)
    expect(parseTex(anidada)[0]!.kind).toBe('env')
    expect(joined(anidada, parseTex(anidada))).toBe(anidada)
  })

  it('una lista vacía no es una lista: no hay elemento que enseñar', () => {
    const vacia = '\\begin{itemize}\n\\end{itemize}\n'
    expect(parseTex(vacia)[0]!.kind).toBe('env')
  })

  it('escribir en la línea final de una lista crea un `\\item`', () => {
    expect(childKind('lista')).toBe('item')
  })
})

describe.skipIf(!hasRepo)('las listas reales del ws-02', () => {
  for (const path of SECTIONS_02) {
    const text = repoFile(path)
    const blocks = parseTex(text)

    it(`${path}: los elementos particionan el cuerpo de su lista`, () => {
      for (const block of flatten(blocks).filter(b => b.kind === 'lista')) {
        expect(joinedItems(text, block)).toBe(bodyOf(text, block))
        expect(block.items!.some(b => b.kind === 'item')).toBe(true)
      }
    })

    it(`${path}: ningún raw esconde ya un \\item de una lista`, () => {
      for (const block of flatten(blocks).filter(b => b.kind === 'raw')) {
        const src = text.slice(block.span.from, block.span.to)
        if (!/\\begin\{(itemize|enumerate)\}/.test(src)) {
          expect(src.includes('\\item ')).toBe(false)
        }
      }
    })
  }
})
