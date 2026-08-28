import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { seedDoc, seedUpdate } from '../app/features/editor/lib/seed'
import { hasRepo, repoFile, WS01 } from './fixtures'

const tex = repoFile(`${WS01}/main.tex`)

/** Dos documentos que se ponen al día el uno con el otro, como haría el canal. */
function sync(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)), 'remote')
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)), 'remote')
}

describe.skipIf(!hasRepo)('siembra del documento', () => {
  it('dos clientes que siembran a la vez dejan el archivo UNA vez', () => {
    // El caso real: se importa un proyecto y dos pestañas lo abren antes de que
    // la primera haya persistido nada, así que ninguna ve updates.
    const uno = new Y.Doc()
    const dos = new Y.Doc()
    seedDoc(uno, tex)
    seedDoc(dos, tex)

    sync(uno, dos)

    expect(uno.getText('content').toString()).toBe(tex)
    expect(dos.getText('content').toString()).toBe(tex)
  })

  it('así es como se rompía: insertar directamente duplica el archivo', () => {
    // Este test documenta el fallo que motivó `seedDoc`. Si algún día vuelve a
    // sembrarse con `insert`, aquí está la prueba de qué pasa.
    const uno = new Y.Doc()
    const dos = new Y.Doc()
    uno.getText('content').insert(0, tex)
    dos.getText('content').insert(0, tex)

    sync(uno, dos)

    expect(uno.getText('content').toString().length).toBe(tex.length * 2)
    expect(uno.getText('content').toString()).not.toBe(tex)
  })

  it('sembrar dos veces el mismo documento no añade nada', () => {
    const doc = new Y.Doc()
    seedDoc(doc, tex)
    Y.applyUpdate(doc, seedUpdate(tex), 'remote')

    expect(doc.getText('content').toString()).toBe(tex)
  })

  it('no siembra si el documento ya tiene texto', () => {
    const doc = new Y.Doc()
    doc.getText('content').insert(0, 'ya escrito')

    expect(seedDoc(doc, tex)).toBe(false)
    expect(doc.getText('content').toString()).toBe('ya escrito')
  })

  it('el update es idéntico venga de donde venga', () => {
    expect(seedUpdate(tex)).toEqual(seedUpdate(tex))
  })

  it('la siembra de un viewer no se difunde: va como «remote»', () => {
    const doc = new Y.Doc()
    const origins: unknown[] = []
    doc.on('update', (_u: Uint8Array, origin: unknown) => origins.push(origin))

    seedDoc(doc, tex, false)

    expect(doc.getText('content').toString()).toBe(tex)
    expect(origins).toEqual(['remote'])
  })
})
