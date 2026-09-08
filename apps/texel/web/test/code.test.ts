/**
 * Bloques de código (`lstlisting`) y capturas (`\captura`).
 *
 * Los dos salían antes como LaTeX crudo, así que lo que se vigila aquí es lo de
 * siempre —que la partición siga cubriendo el archivo y que cada span apunte a
 * su valor— más lo propio de un cuerpo literal: que las llaves de un payload no
 * se traten como llaves de LaTeX y que un `\end{…}` no se pueda colar dentro.
 */
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { parseTex } from '../app/features/visual/lib/parse-tex'
import { applyFieldEdit, checkVerbatim, parseDoc } from '../app/features/visual/lib/doc-sync'
import { capturaTemplate, specOf } from '../app/features/visual/lib/catalog'
import type { Block } from '../app/features/visual/lib/types'
import { flatten, hasRepo, joined, repoFile, SECTIONS_02 } from './fixtures'

const LISTING = `\\subsection{Nivel 1}

\\begin{lstlisting}[language=HTML]
<img src="x" onerror="alert({'Over'})">
\\end{lstlisting}

\\captura{xss-nivel1.png}{Nivel 1 resuelto}

Un párrafo detrás.
`

function docWith(text: string) {
  const doc = new Y.Doc()
  const ytext = doc.getText('content')
  ytext.insert(0, text)
  return ytext
}

function only(blocks: Block[], kind: Block['kind']): Block {
  const found = flatten(blocks).filter(b => b.kind === kind)
  expect(found).toHaveLength(1)
  return found[0]!
}

describe('bloque de código', () => {
  const blocks = parseTex(LISTING)

  it('el listing es un bloque y la partición sigue cubriendo el archivo', () => {
    expect(joined(LISTING, blocks)).toBe(LISTING)
    expect(only(blocks, 'code').items).toBeUndefined()
  })

  it('el cuerpo es el código y nada más: ni el \\begin ni el \\end ni sus saltos', () => {
    const code = only(blocks, 'code')
    const codigo = code.fields.find(f => f.name === 'codigo')!
    expect(codigo.value).toBe('<img src="x" onerror="alert({\'Over\'})">')
    expect(LISTING.slice(codigo.span.from, codigo.span.to)).toBe(codigo.value)
    expect(codigo.verbatim).toBe(true)
  })

  it('el lenguaje es solo el valor: cambiarlo es un parche de cuatro letras', () => {
    const lenguaje = only(blocks, 'code').fields.find(f => f.name === 'lenguaje')!
    expect(lenguaje.value).toBe('HTML')
    expect(LISTING.slice(lenguaje.span.from, lenguaje.span.to)).toBe('HTML')
  })

  it('un listing sin opciones no tiene campo de lenguaje, pero sí cuerpo', () => {
    const suelto = '\\begin{lstlisting}\nls -la\n\\end{lstlisting}\n'
    const code = only(parseTex(suelto), 'code')
    expect(code.fields.map(f => f.name)).toEqual(['codigo'])
    expect(code.fields[0]!.value).toBe('ls -la')
    expect(joined(suelto, parseTex(suelto))).toBe(suelto)
  })

  it('un listing vacío da un campo vacío en el sitio donde se escribirá', () => {
    const vacio = '\\begin{lstlisting}[language=bash]\n\\end{lstlisting}\n'
    const codigo = only(parseTex(vacio), 'code').fields.find(f => f.name === 'codigo')!
    expect(codigo.value).toBe('')
    expect(codigo.span.from).toBe(codigo.span.to)
  })

  it('dentro del cuerpo las llaves son literales: se escriben sin protestar', () => {
    const ytext = docWith(LISTING)
    const code = only(parseDoc(ytext.toString(), 'tex'), 'code')
    const codigo = code.fields.find(f => f.name === 'codigo')!
    expect(applyFieldEdit(ytext, codigo, 'function f() { return {')).toBeNull()
    expect(ytext.toString()).toContain('function f() { return {')
    // Y lo que se escribió sigue siendo un solo bloque de código.
    expect(only(parseTex(ytext.toString()), 'code')).toBeDefined()
  })

  it('un \\end{…} dentro del cuerpo se rechaza: cerraría el entorno', () => {
    expect(checkVerbatim('ls\n\\end{lstlisting}\nmás')).toMatch(/no puede llevar/)
    const ytext = docWith(LISTING)
    const codigo = only(parseDoc(ytext.toString(), 'tex'), 'code')
      .fields.find(f => f.name === 'codigo')!
    expect(applyFieldEdit(ytext, codigo, '\\end{lstlisting}')).toMatch(/no puede llevar/)
    expect(ytext.toString()).toBe(LISTING)
  })

  it('la plantilla del catálogo trae ya el entorno y la marca de cursor', () => {
    expect(specOf('code').template).toBe(
      '\\begin{lstlisting}[language=bash]\n|\n\\end{lstlisting}\n\n')
  })
})

describe('captura', () => {
  const blocks = parseTex(LISTING)

  it('`\\captura{archivo}{pie}` es un bloque de imagen, no LaTeX crudo', () => {
    const figura = only(blocks, 'figura')
    expect(figura.meta?.cmd).toBe('captura')
    expect(figura.fields.map(f => [f.name, f.value])).toEqual([
      ['pie', 'Nivel 1 resuelto'],
      ['ruta', 'xss-nivel1.png']
    ])
  })

  it('el bloque abarca la macro entera y nada más', () => {
    const figura = only(blocks, 'figura')
    expect(LISTING.slice(figura.span.from, figura.span.to))
      .toBe('\\captura{xss-nivel1.png}{Nivel 1 resuelto}')
  })

  it('lo que se inserta es la macro del curso, con el cursor en el pie', () => {
    expect(capturaTemplate('QRT-482.png')).toBe('\\captura{QRT-482.png}{|}\n\n')
  })
})

describe.skipIf(!hasRepo)('los archivos reales del ws-02', () => {
  for (const path of SECTIONS_02) {
    const text = repoFile(path)
    const blocks = parseTex(text)

    it(`${path}: los bloques cubren el archivo entero`, () => {
      expect(joined(text, blocks)).toBe(text)
    })

    it(`${path}: cada span de campo apunta exactamente a su valor`, () => {
      for (const block of flatten(blocks)) {
        for (const f of block.fields) {
          expect(text.slice(f.span.from, f.span.to)).toBe(f.value)
        }
      }
    })

    it(`${path}: ningún raw esconde ya un listing ni una captura`, () => {
      for (const block of flatten(blocks).filter(b => b.kind === 'raw')) {
        const src = text.slice(block.span.from, block.span.to)
        expect(src).not.toMatch(/\\begin\{lstlisting\}/)
        expect(src).not.toMatch(/\\captura\{/)
      }
    })
  }
})
