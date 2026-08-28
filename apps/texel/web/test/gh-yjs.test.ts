import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { patchDoc } from '../server/utils/gh/yjs'
import { seedUpdate } from '../app/features/editor/lib/seed'

/** Un documento con contenido, como el que reconstruye el servidor al abrirlo. */
function docWith(text: string): Y.Doc {
  const doc = new Y.Doc()
  Y.applyUpdate(doc, seedUpdate(text))
  return doc
}

const ANTES = '\\section{Uno}\n\nPárrafo primero.\n\n\\section{Dos}\n\nPárrafo segundo.\n'

describe('traer un cambio del repositorio al documento compartido', () => {
  it('deja el texto que viene del repo', () => {
    const doc = docWith(ANTES)
    const despues = ANTES.replace('Párrafo primero.', 'Párrafo primero, corregido.')
    expect(patchDoc(doc, despues)).not.toBeNull()
    expect(doc.getText('content').toString()).toBe(despues)
  })

  it('sin cambios no produce update: no se emite ni se escribe nada', () => {
    expect(patchDoc(docWith(ANTES), ANTES)).toBeNull()
  })

  it('quien tiene el archivo abierto converge con lo que se guardó', () => {
    // El servidor emite el update por Realtime; el cliente lo aplica. Los dos
    // documentos tienen que acabar diciendo lo mismo, que es lo que evita que el
    // siguiente volcado del cliente reescriba lo traído.
    const servidor = docWith(ANTES)
    const cliente = docWith(ANTES)

    const despues = `${ANTES}\n\\section{Tres}\n`
    const update = patchDoc(servidor, despues)!
    Y.applyUpdate(cliente, update, 'remote')

    expect(cliente.getText('content').toString()).toBe(despues)
    expect(cliente.getText('content').toString()).toBe(servidor.getText('content').toString())
  })

  it('no pisa lo que otra persona está escribiendo en otro punto', () => {
    const servidor = docWith(ANTES)
    const cliente = docWith(ANTES)

    // El cliente teclea al final mientras el servidor trae un cambio del repo.
    cliente.getText('content').insert(ANTES.length, 'Y algo más tecleado.\n')
    const tecleado = Y.encodeStateAsUpdate(cliente)

    const update = patchDoc(servidor, ANTES.replace('Uno', 'Primero'))!

    Y.applyUpdate(cliente, update, 'remote')
    Y.applyUpdate(servidor, tecleado, 'remote')

    const texto = cliente.getText('content').toString()
    expect(texto).toBe(servidor.getText('content').toString())
    expect(texto).toContain('\\section{Primero}')
    expect(texto).toContain('Y algo más tecleado.')
  })

  it('un archivo vacío se llena sin duplicar', () => {
    const doc = new Y.Doc()
    patchDoc(doc, 'contenido nuevo\n')
    expect(doc.getText('content').toString()).toBe('contenido nuevo\n')
  })

  it('borrarlo todo desde el repo deja el documento vacío', () => {
    const doc = docWith(ANTES)
    patchDoc(doc, '')
    expect(doc.getText('content').toString()).toBe('')
  })
})
