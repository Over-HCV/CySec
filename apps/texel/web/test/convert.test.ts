/**
 * Cambiar un bloque de tipo.
 *
 * Lo que se vigila es que no se pierda nada por el camino: el texto que llevaba
 * dentro sigue estando, los hijos de un contenedor no se mueven, la separación
 * entre bloques del archivo se queda donde estaba, y lo que no se puede escribir
 * —llaves sin cerrar dentro de un `\section{…}`— se rechaza en vez de escribirse
 * a medias.
 */
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { parseTex } from '../app/features/visual/lib/parse-tex'
import { convertBlock, parseDoc, payloadOf, renderAs, STALE } from '../app/features/visual/lib/doc-sync'
import { CONVERSIONS } from '../app/features/visual/lib/catalog'
import type { Block, BlockKind } from '../app/features/visual/lib/types'
import { flatten, joined } from './fixtures'

function docWith(text: string) {
  const doc = new Y.Doc()
  const ytext = doc.getText('content')
  ytext.insert(0, text)
  return ytext
}

function find(blocks: Block[], kind: BlockKind, contiene?: string): Block {
  const block = flatten(blocks).find(b => b.kind === kind
    && (contiene === undefined || b.fields.some(f => f.value.includes(contiene))))
  expect(block, `no hay ningún bloque ${kind}`).toBeDefined()
  return block!
}

/** Convierte sobre un documento de verdad y devuelve el texto resultante. */
function convert(text: string, from: BlockKind, to: BlockKind, contiene?: string) {
  const ytext = docWith(text)
  const blocks = parseDoc(ytext.toString(), 'tex')
  const problem = convertBlock(ytext, find(blocks, from, contiene), to, ytext.toString())
  return { problem, text: ytext.toString() }
}

describe('hojas', () => {
  const DOC = 'Antes.\n\nUn párrafo que era prosa.\n\nDespués.\n'

  it('un párrafo se vuelve una sección con su mismo texto', () => {
    const { problem, text } = convert(DOC, 'paragraph', 'section', 'era prosa')
    expect(problem).toBeNull()
    expect(text).toContain('\\section{Un párrafo que era prosa.}')
  })

  it('la separación entre bloques no cambia: ni una línea en blanco más', () => {
    const { text } = convert(DOC, 'paragraph', 'section', 'era prosa')
    expect(text.split('\n').length).toBe(DOC.split('\n').length)
    expect(text.startsWith('Antes.\n\n')).toBe(true)
    expect(text.endsWith('\n\nDespués.\n')).toBe(true)
  })

  it('y el resultado sigue particionando el archivo', () => {
    const { text } = convert(DOC, 'paragraph', 'section', 'era prosa')
    expect(joined(text, parseTex(text))).toBe(text)
  })

  it('una sección vuelve a ser prosa con solo su título', () => {
    const { text } = convert('\\section{Un título}\n\nCuerpo.\n', 'section', 'paragraph')
    expect(text).toBe('Un título\n\nCuerpo.\n')
  })

  it('un párrafo de varias líneas cabe en un título de una', () => {
    expect(renderAs('section', { cuerpo: 'dos\n  líneas' })).toBe('\\section{dos líneas}')
  })

  it('un párrafo se vuelve código y el código conserva su cuerpo', () => {
    const { text } = convert('sqlmap -h\n', 'paragraph', 'code')
    expect(text).toBe('\\begin{lstlisting}\nsqlmap -h\n\\end{lstlisting}\n')
    const code = find(parseTex(text), 'code')
    expect(code.fields.find(f => f.name === 'codigo')!.value).toBe('sqlmap -h')
  })

  it('un código con llaves no se convierte en prosa: rompería el documento', () => {
    const source = '\\begin{lstlisting}\nif (x) { return\n\\end{lstlisting}\n'
    const { problem, text } = convert(source, 'code', 'paragraph')
    expect(problem).toMatch(/Falta cerrar una llave/)
    expect(text).toBe(source)
  })

  it('una pregunta se convierte en nota de borrador sin perder el enunciado', () => {
    const { text } = convert('\\pregunta{¿Qué pasó?}\n', 'pregunta', 'porque')
    expect(text).toContain('¿Qué pasó?')
    expect(text.startsWith('\\porque{')).toBe(true)
  })

  it('el texto que lleva dentro un bloque sale igual de donde esté', () => {
    const doc = '\\pregunta{Enunciado}\n'
    expect(payloadOf(find(parseTex(doc), 'pregunta'), doc)).toEqual({ cuerpo: 'Enunciado' })
  })
})

describe('contenedores', () => {
  const CASO = `\\begin{caso}{Un título del caso}
  Primera línea del cuerpo.

  \\pregunta{¿Y esto?}
\\end{caso}
`

  it('cambia el envoltorio y los hijos se quedan donde estaban', () => {
    const { problem, text } = convert(CASO, 'caso', 'respuesta')
    expect(problem).toBeNull()
    expect(text).toContain('\\begin{respuesta}')
    expect(text).toContain('\\end{respuesta}')
    expect(text).toContain('\\pregunta{¿Y esto?}')
    expect(text).toContain('Primera línea del cuerpo.')
    expect(joined(text, parseTex(text))).toBe(text)
  })

  it('el título, que el destino no admite, baja al cuerpo en vez de perderse', () => {
    const { text } = convert(CASO, 'caso', 'respuesta')
    expect(text).toContain('Un título del caso')
    expect(text.indexOf('Un título del caso')).toBeGreaterThan(text.indexOf('\\begin{respuesta}'))
  })

  it('y al revés, el destino que pide título nace con uno vacío', () => {
    const { text } = convert('\\begin{respuesta}\nAlgo.\n\\end{respuesta}\n', 'respuesta', 'caso')
    expect(text.startsWith('\\begin{caso}{}')).toBe(true)
    expect(text).toContain('Algo.')
  })

  it('el bloque convertido se sigue leyendo como el tipo nuevo', () => {
    const { text } = convert(CASO, 'caso', 'respuesta')
    expect(find(parseTex(text), 'respuesta').items?.length).toBeGreaterThan(0)
  })
})

describe('cuándo se puede convertir', () => {
  it('nada se convierte en sí mismo', () => {
    for (const [kind, destinos] of Object.entries(CONVERSIONS)) {
      expect(destinos).not.toContain(kind)
    }
  })

  it('un bloque que ya no está donde estaba no se toca', () => {
    const ytext = docWith('Un párrafo.\n')
    const block = find(parseDoc(ytext.toString(), 'tex'), 'paragraph')
    // Alguien escribe por delante: los rangos del bloque ya no valen.
    ytext.insert(0, 'Otra cosa antes.\n\n')
    expect(convertBlock(ytext, block, 'section', 'Un párrafo.\n')).toBe(STALE)
    expect(ytext.toString()).toBe('Otra cosa antes.\n\nUn párrafo.\n')
  })
})
