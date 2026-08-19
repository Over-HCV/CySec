/**
 * Escribir en un contenedor: lo que pasa cuando alguien teclea en la línea
 * «Escribe aquí tu respuesta…» y sigue escribiendo.
 *
 * Son las tres averías que se veían en pantalla, reducidas a texto: el párrafo
 * que nacía con una línea en blanco delante, la letra que se iba a una línea
 * nueva cada vez, y el texto que se duplicaba en cuanto había una línea en
 * blanco de por medio. Aquí no hay Vue ni navegador — la aritmética de rangos
 * basta para reproducirlas, que es justo la razón de que quepan en un test.
 */
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { applyFieldEdit, insideOf, parseDoc, STALE } from '../app/features/visual/lib/doc-sync'
import { latexOffsetOfPlain } from '../app/features/visual/lib/inline'
import type { Block, Field } from '../app/features/visual/lib/types'

/** La respuesta vacía tal y como sale de la plantilla del curso. */
const VACIA = '\\pregunta{Texto de la pregunta.}\n\\begin{respuesta}\n\\end{respuesta}\n'

function docWith(text: string) {
  const doc = new Y.Doc()
  const ytext = doc.getText('content')
  ytext.insert(0, text)
  return ytext
}

function find(blocks: Block[], kind: Block['kind']): Block {
  for (const block of blocks) {
    if (block.kind === kind) return block
    if (block.items) {
      const inner = block.items.find(b => b.kind === kind)
      if (inner) return inner
      for (const child of block.items) {
        if (child.items?.some(b => b.kind === kind)) return child.items.find(b => b.kind === kind)!
      }
    }
  }
  throw new Error(`no hay ningún bloque ${kind}`)
}

/**
 * Lo que hace `useBlocks.writeInside`: escribir al final del contenedor.
 *
 * `snapshot` es el texto del que salió `container`, no el de ahora — igual que
 * en la aplicación, donde entre el parseo y la tecla caben 300 ms. Es lo que
 * convierte el `guard` en una comprobación de verdad.
 */
function writeInside(ytext: Y.Text, container: Block, value: string, snapshot: string) {
  const at = insideOf(container)!
  const prefix = snapshot.slice(0, at).endsWith('\n') ? '' : '\n'
  const inserted = `${prefix}${value}\n`
  const problem = applyFieldEdit(
    ytext,
    { name: 'nuevo', span: { from: at, to: at }, value: '' },
    inserted,
    { span: container.span, expected: snapshot.slice(container.span.from, container.span.to) }
  )
  return { problem, caret: at + prefix.length + value.length }
}

/** El campo de prosa de un bloque, tal y como lo pinta la interfaz. */
function prosa(blocks: Block[]): Field {
  return find(blocks, 'paragraph').fields[0]!
}

describe('escribir en una respuesta vacía', () => {
  it('escribe el texto dentro del entorno, en su propia línea', () => {
    const ytext = docWith(VACIA)
    const respuesta = find(parseDoc(VACIA, 'tex'), 'respuesta')

    expect(writeInside(ytext, respuesta, 'H', VACIA).problem).toBeNull()
    expect(ytext.toString()).toBe(
      '\\pregunta{Texto de la pregunta.}\n\\begin{respuesta}\nH\n\\end{respuesta}\n')
  })

  it('lo editable es «H», no «\\nH\\n»: los saltos separan bloques, no son de nadie', () => {
    const ytext = docWith(VACIA)
    writeInside(ytext, find(parseDoc(VACIA, 'tex'), 'respuesta'), 'H', VACIA)

    const texto = ytext.toString()
    expect(prosa(parseDoc(texto, 'tex')).value).toBe('H')
  })

  it('el cursor queda detrás de lo escrito, dentro del párrafo nuevo', () => {
    const ytext = docWith(VACIA)
    const { caret } = writeInside(ytext, find(parseDoc(VACIA, 'tex'), 'respuesta'), 'Hola', VACIA)

    const campo = prosa(parseDoc(ytext.toString(), 'tex')).span
    expect(caret).toBeGreaterThanOrEqual(campo.from)
    expect(caret).toBe(campo.to)
  })

  it('seguir escribiendo alarga el párrafo, no crea una línea por letra', () => {
    const ytext = docWith(VACIA)
    writeInside(ytext, find(parseDoc(VACIA, 'tex'), 'respuesta'), 'H', VACIA)

    // A partir de aquí se escribe en el párrafo, que es donde quedó el cursor.
    const campo = prosa(parseDoc(ytext.toString(), 'tex'))
    expect(applyFieldEdit(ytext, campo, 'Hola')).toBeNull()
    expect(ytext.toString()).toBe(
      '\\pregunta{Texto de la pregunta.}\n\\begin{respuesta}\nHola\n\\end{respuesta}\n')
  })

  it('la inserción se niega si el contenedor se movió por debajo', () => {
    const ytext = docWith(VACIA)
    const respuesta = find(parseDoc(VACIA, 'tex'), 'respuesta')
    // Alguien escribe antes: el sitio calculado ya no es el sitio.
    ytext.insert(0, '% nota\n')

    expect(writeInside(ytext, respuesta, 'H', VACIA).problem).toBe(STALE)
  })
})

describe('regresión: el texto se duplicaba al haber una línea en blanco', () => {
  /**
   * Lo que pasaba: el campo guardaba «…\n\nso», el reparseo partía el párrafo
   * en dos, y el siguiente guardado volvía a escribir el borrador entero sobre
   * el rango del primero — con el segundo todavía detrás. De ahí salía
   * `so what?so what?so whatso whaso whso wso sos`.
   */
  const CON_TEXTO = '\\begin{respuesta}\nHello world\n\\end{respuesta}\n'

  it('cada guardado escribe sobre el campo de ahora, no sobre el de antes', () => {
    const ytext = docWith(CON_TEXTO)

    // Enter y una palabra: el párrafo se parte.
    const campo = prosa(parseDoc(ytext.toString(), 'tex'))
    expect(applyFieldEdit(ytext, campo, 'Hello world\n\nso')).toBeNull()

    // Se sigue escribiendo. El campo se vuelve a resolver contra el árbol de
    // ahora, que ya tiene dos párrafos.
    const blocks = parseDoc(ytext.toString(), 'tex')
    const parrafos = find(blocks, 'respuesta').items!.filter(b => b.kind === 'paragraph')
    expect(parrafos).toHaveLength(2)

    expect(applyFieldEdit(ytext, parrafos[1]!.fields[0]!, 'so what?')).toBeNull()
    expect(ytext.toString()).toBe(
      '\\begin{respuesta}\nHello world\n\nso what?\n\\end{respuesta}\n')
  })

  it('el documento avisa de que el campo cambió: deja de decir lo que se guardó', () => {
    // Esta es la señal con la que `RichText` se recoloca, y hace falta porque
    // `applyFieldEdit` **no** puede ver el problema: el rango del campo sigue
    // diciendo lo mismo que decía, es el borrador el que se quedó viejo.
    const ytext = docWith(CON_TEXTO)
    const guardado = 'Hello world\n\nso'
    expect(applyFieldEdit(ytext, prosa(parseDoc(ytext.toString(), 'tex')), guardado)).toBeNull()

    const ahora = prosa(parseDoc(ytext.toString(), 'tex'))
    expect(ahora.value).not.toBe(guardado)
    expect(ahora.value).toBe('Hello world')
  })
})

describe('partir un párrafo con Enter', () => {
  const UNO = '\\begin{respuesta}\nHola \\textbf{mundo} y más\n\\end{respuesta}\n'

  it('el corte cae donde está el cursor, contando lo que se ve', () => {
    const campo = prosa(parseDoc(UNO, 'tex'))
    // «Hola mundo| y más» — 10 caracteres de pantalla, 18 de LaTeX.
    expect(latexOffsetOfPlain(campo.value, 10)).toBe('Hola \\textbf{mundo}'.length)
  })

  it('escribe una línea en blanco y deja dos párrafos', () => {
    const ytext = docWith(UNO)
    const campo = prosa(parseDoc(UNO, 'tex'))
    const cut = latexOffsetOfPlain(campo.value, 10)

    expect(applyFieldEdit(
      ytext, campo, `${campo.value.slice(0, cut)}\n\n${campo.value.slice(cut)}`)).toBeNull()
    expect(ytext.toString()).toBe(
      '\\begin{respuesta}\nHola \\textbf{mundo}\n\n y más\n\\end{respuesta}\n')

    const parrafos = find(parseDoc(ytext.toString(), 'tex'), 'respuesta')
      .items!.filter(b => b.kind === 'paragraph')
    expect(parrafos).toHaveLength(2)
    // El cursor va al principio del texto del segundo, que ya es un bloque
    // aparte. El espacio que quedó delante del corte no es de ningún campo, así
    // que el cursor lo salta en vez de quedarse en tierra de nadie.
    const texto = ytext.toString()
    let at = campo.span.from + cut + 2
    while (texto[at] === ' ' || texto[at] === '\t') at++
    expect(at).toBe(parrafos[1]!.fields[0]!.span.from)
  })
})
