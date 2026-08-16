import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  applyBodyEdit, applyFieldEdit, checkValue, duplicateBlock, insertBlock, insideOf, moveBlock,
  parseDoc, removeBlock, renameEnv, toggleOption
} from '../app/features/visual/lib/doc-sync'
import type { Block } from '../app/features/visual/lib/types'
import { joined, REFS_BIB, repoFile, SECTIONS } from './fixtures'

const bib = repoFile(REFS_BIB)
const tex = repoFile(SECTIONS[0]!)

/** Documento Yjs sembrado con un texto, como al abrir un archivo. */
function docWith(text: string) {
  const doc = new Y.Doc()
  const ytext = doc.getText('content')
  ytext.insert(0, text)
  return { doc, ytext }
}

function fieldOf(blocks: Block[], kind: Block['kind'], name: string, index = 0) {
  const block = blocks.filter(b => b.kind === kind)[index]!
  return block.fields.find(f => f.name === name)!
}

describe('applyFieldEdit', () => {
  it('cambia solo el rango del campo, byte a byte', () => {
    const { ytext } = docWith(bib)
    const blocks = parseDoc(bib, 'bib')
    const togaf = blocks.find(b =>
      b.kind === 'bibEntry' && b.fields.some(f => f.name === 'clave' && f.value === 'togaf92'))!
    const year = togaf.fields.find(f => f.name === 'year')!

    expect(applyFieldEdit(ytext, year, '2019')).toBeNull()

    const after = ytext.toString()
    expect(after).toBe(
      bib.slice(0, year.span.from) + '2019' + bib.slice(year.span.to)
    )
    // El resto del archivo, incluida la entrada desalineada, intacto.
    expect(after).toContain('  journaltitle = {Forbes},')
    expect(after.length).toBe(bib.length)
  })

  it('deja el documento parseable y con partición total', () => {
    const { ytext } = docWith(tex)
    const blocks = parseDoc(tex, 'tex')
    applyBodyEdit(ytext, blocks.find(b => b.kind === 'respuesta')!, '\nUna respuesta escrita.\n')

    const after = ytext.toString()
    const reparsed = parseDoc(after, 'tex')
    expect(joined(after, reparsed)).toBe(after)
    expect(reparsed.filter(b => b.kind === 'respuesta')).toHaveLength(3)
    const primera = reparsed.find(b => b.kind === 'respuesta')!
    expect(after.slice(primera.meta!.bodyFrom!, primera.meta!.bodyTo!).trim())
      .toBe('Una respuesta escrita.')
  })

  it('se niega a escribir llaves descompensadas y no toca el documento', () => {
    const { ytext } = docWith(tex)
    const blocks = parseDoc(tex, 'tex')
    const problema = applyFieldEdit(ytext, fieldOf(blocks, 'pregunta', 'enunciado'), 'roto {')

    expect(problema).toBe('Falta cerrar una llave «{»')
    expect(ytext.toString()).toBe(tex)
  })

  it('acepta llaves equilibradas y escapadas', () => {
    expect(checkValue('con \\{ escapada')).toBeNull()
    expect(checkValue('{anidado {del todo}}')).toBeNull()
    expect(checkValue('}')).toBe('Sobra una llave de cierre «}»')
  })
})

describe('convergencia con edición simultánea', () => {
  it('un bloque y el texto plano no se pisan', () => {
    // Dos clientes sobre el mismo archivo: uno en visual, otro en código.
    const visual = new Y.Doc()
    const codigo = new Y.Doc()
    visual.getText('content').insert(0, tex)
    Y.applyUpdate(codigo, Y.encodeStateAsUpdate(visual))

    const blocks = parseDoc(tex, 'tex')
    const caso = fieldOf(blocks, 'caso', 'titulo')
    applyFieldEdit(visual.getText('content'), caso, 'Otro caso distinto')

    // El de código escribe al final, lejos del bloque tocado.
    codigo.getText('content').insert(tex.length, '\n% comentario del otro\n')

    Y.applyUpdate(codigo, Y.encodeStateAsUpdate(visual, Y.encodeStateVector(codigo)))
    Y.applyUpdate(visual, Y.encodeStateAsUpdate(codigo, Y.encodeStateVector(visual)))

    const a = visual.getText('content').toString()
    const b = codigo.getText('content').toString()
    expect(a).toBe(b)
    expect(a).toContain('\\begin{caso}{Otro caso distinto}')
    expect(a).toContain('% comentario del otro')
    expect(joined(a, parseDoc(a, 'tex'))).toBe(a)
  })

  it('dos personas en bloques distintos conservan ambos cambios', () => {
    const uno = new Y.Doc()
    const dos = new Y.Doc()
    uno.getText('content').insert(0, tex)
    Y.applyUpdate(dos, Y.encodeStateAsUpdate(uno))

    const blocks = parseDoc(tex, 'tex')
    applyFieldEdit(uno.getText('content'), fieldOf(blocks, 'pregunta', 'enunciado', 0), 'Primera')
    applyFieldEdit(dos.getText('content'), fieldOf(blocks, 'pregunta', 'enunciado', 2), 'Tercera')

    Y.applyUpdate(dos, Y.encodeStateAsUpdate(uno, Y.encodeStateVector(dos)))
    Y.applyUpdate(uno, Y.encodeStateAsUpdate(dos, Y.encodeStateVector(uno)))

    const text = uno.getText('content').toString()
    expect(text).toBe(dos.getText('content').toString())
    expect(text).toContain('\\pregunta{Primera}')
    expect(text).toContain('\\pregunta{Tercera}')
  })
})

describe('operaciones de bloque', () => {
  it('insertBlock coloca la plantilla y devuelve el cursor', () => {
    const { ytext } = docWith(tex)
    const at = parseDoc(tex, 'tex').find(b => b.kind === 'pregunta')!.span.from
    const caret = insertBlock(ytext, at, 'pregunta')

    const after = ytext.toString()
    expect(after.slice(at, at + 10)).toBe('\\pregunta{')
    expect(caret).toBe(at + '\\pregunta{'.length)
    expect(joined(after, parseDoc(after, 'tex'))).toBe(after)
  })

  it('removeBlock borra el bloque entero y nada más', () => {
    const { ytext } = docWith(tex)
    const caso = parseDoc(tex, 'tex').find(b => b.kind === 'caso')!
    removeBlock(ytext, caso)

    const after = ytext.toString()
    expect(after).toBe(tex.slice(0, caso.span.from) + tex.slice(caso.span.to))
    expect(after).not.toContain('\\begin{caso}')
    expect(joined(after, parseDoc(after, 'tex'))).toBe(after)
  })

  it('duplicateBlock repite el bloque tal cual', () => {
    const { ytext } = docWith(tex)
    const caso = parseDoc(tex, 'tex').find(b => b.kind === 'caso')!
    duplicateBlock(ytext, caso)

    const after = ytext.toString()
    expect(parseDoc(after, 'tex').filter(b => b.kind === 'caso')).toHaveLength(2)
    expect(joined(after, parseDoc(after, 'tex'))).toBe(after)
  })

  it('moveBlock intercambia con el vecino visible, saltando los huecos', () => {
    const { ytext } = docWith(tex)
    const blocks = parseDoc(tex, 'tex')
    // Vecino de la primera pregunta es su respuesta, no la siguiente pregunta:
    // entre ambas solo hay un salto de línea, que no se pinta.
    const first = blocks.findIndex(b => b.kind === 'pregunta')
    moveBlock(ytext, blocks, first, 1)

    const after = ytext.toString()
    expect(after).toContain('\\begin{respuesta}\n\\end{respuesta}\n\\pregunta{¿Qué tipos de datos fueron expuestos?}')
    // Un intercambio no crea ni destruye texto.
    expect(after.length).toBe(tex.length)
    expect(joined(after, parseDoc(after, 'tex'))).toBe(after)
  })

  it('toggleOption marca y desmarca una opción', () => {
    const { ytext } = docWith(tex)
    const opcion = parseDoc(tex, 'tex').find(b => b.kind === 'mcq')!.items!
      .find(b => b.kind === 'opcion')!
    toggleOption(ytext, opcion)

    const marcada = ytext.toString()
    expect(marcada.slice(opcion.span.from, opcion.span.from + 8)).toBe('\\opcion*')
    expect(joined(marcada, parseDoc(marcada, 'tex'))).toBe(marcada)

    const otra = parseDoc(marcada, 'tex').find(b => b.kind === 'mcq')!.items!
      .find(b => b.kind === 'opcion')!
    expect(otra.flags!.correcta).toBe(true)
    toggleOption(ytext, otra)
    expect(ytext.toString()).toBe(tex)
  })

  it('moveBlock no hace nada si no hay vecino visible', () => {
    const { ytext } = docWith(tex)
    const blocks = parseDoc(tex, 'tex')
    moveBlock(ytext, blocks, 0, -1)
    expect(ytext.toString()).toBe(tex)
  })

  it('moveBlock ordena también entre hermanos anidados', () => {
    const { ytext } = docWith(tex)
    const fuentes = parseDoc(tex, 'tex').find(b => b.kind === 'fuentes')!
    const items = fuentes.items!
    const primera = items.findIndex(b => b.kind === 'fuente')
    moveBlock(ytext, items, primera, 1)

    const after = ytext.toString()
    expect(after.length).toBe(tex.length)
    expect(joined(after, parseDoc(after, 'tex'))).toBe(after)
    const urls = parseDoc(after, 'tex').find(b => b.kind === 'fuentes')!.items!
      .filter(b => b.kind === 'fuente').map(b => b.fields[0]!.value)
    // La segunda fuente pasa a ser la primera.
    expect(urls[0]).toContain('digitalguardian.com')
    expect(urls[1]).toContain('wikipedia.org')
  })
})

describe('contenedores', () => {
  it('insideOf apunta detrás del último hijo, o al cuerpo si está vacío', () => {
    const blocks = parseDoc(tex, 'tex')
    const fuentes = blocks.find(b => b.kind === 'fuentes')!
    expect(insideOf(fuentes)).toBe(fuentes.items![fuentes.items!.length - 1]!.span.to)

    const vacio = parseDoc('\\begin{mio}\\end{mio}\n', 'tex')[0]!
    expect(insideOf(vacio)).toBe(vacio.meta!.bodyFrom)
  })

  it('insertBlock dentro de un contenedor mantiene la partición', () => {
    const { ytext } = docWith(tex)
    const fuentes = parseDoc(tex, 'tex').find(b => b.kind === 'fuentes')!
    insertBlock(ytext, insideOf(fuentes)!, 'fuente')

    const after = ytext.toString()
    expect(joined(after, parseDoc(after, 'tex'))).toBe(after)
    const dentro = parseDoc(after, 'tex').find(b => b.kind === 'fuentes')!
    expect(dentro.items!.filter(b => b.kind === 'fuente')).toHaveLength(4)
  })

  it('renameEnv cambia los dos extremos a la vez', () => {
    const { ytext } = docWith('\\begin{mio}\ncuerpo\n\\end{mio}\n')
    const env = parseDoc(ytext.toString(), 'tex')[0]!
    expect(renameEnv(ytext, env, 'tuyo')).toBeNull()
    expect(ytext.toString()).toBe('\\begin{tuyo}\ncuerpo\n\\end{tuyo}\n')
  })

  it('renameEnv rechaza un nombre que rompería el archivo', () => {
    const original = '\\begin{mio}\nx\n\\end{mio}\n'
    const { ytext } = docWith(original)
    const env = parseDoc(original, 'tex')[0]!
    expect(renameEnv(ytext, env, 'con espacio')).toBe('Nombre de entorno no válido')
    expect(ytext.toString()).toBe(original)
  })

  it('applyBodyEdit escribe solo entre \\begin y \\end', () => {
    const original = '\\begin{mio}\nviejo\n\\end{mio}\n'
    const { ytext } = docWith(original)
    const env = parseDoc(original, 'tex')[0]!
    expect(applyBodyEdit(ytext, env, '\nnuevo\n')).toBeNull()
    expect(ytext.toString()).toBe('\\begin{mio}\nnuevo\n\\end{mio}\n')
  })
})
