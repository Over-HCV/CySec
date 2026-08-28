/**
 * Siembra del documento colaborativo a partir del texto plano de `files.content`.
 *
 * El problema que resuelve: un `Y.Text` vacío se sembraba con
 * `ytext.insert(0, content)` desde el cliente que abría el archivo. Dos clientes
 * que abran a la vez un archivo recién creado —dos pestañas, dos personas, o
 * abrirlo justo después de importarlo— hacen esa inserción cada uno con su
 * `clientID`, y para Yjs son **dos inserciones distintas** en la misma posición:
 * las funde entrelazando el documento consigo mismo. El archivo aparece
 * duplicado y descolocado, y no hay forma de deshacerlo desde el CRDT.
 *
 * La solución es que la siembra no dependa de quién la haga: se construye en un
 * documento auxiliar con un `clientID` fijo y se aplica como update. Dos
 * clientes que siembren el mismo contenido producen el **mismo** update, con los
 * mismos identificadores de item, así que aplicarlo dos veces no añade nada.
 */
import * as Y from 'yjs'

/**
 * `clientID` reservado para la siembra. Ningún cliente real lo usa: Yjs los
 * genera aleatorios de 32 bits, y este documento auxiliar muere en el acto.
 */
const SEED_CLIENT_ID = 0

/** Marca de origen de la siembra; se difunde y se persiste como cualquier edición. */
export const SEED_ORIGIN = 'seed'

/** Update que deja `content` en el texto `'content'`, idéntico lo genere quien lo genere. */
export function seedUpdate(content: string): Uint8Array {
  const seed = new Y.Doc()
  seed.clientID = SEED_CLIENT_ID
  seed.getText('content').insert(0, content)
  const update = Y.encodeStateAsUpdate(seed)
  seed.destroy()
  return update
}

/**
 * Siembra el documento si sigue vacío.
 *
 * `local: false` (un `viewer`) aplica la siembra con origen `'remote'`: la ve en
 * su pantalla pero no la emite ni la persiste. Quien no puede escribir tampoco
 * debe poder escribir por la puerta de atrás.
 */
export function seedDoc(doc: Y.Doc, content: string, local = true): boolean {
  if (!content || doc.getText('content').length > 0) return false
  Y.applyUpdate(doc, seedUpdate(content), local ? SEED_ORIGIN : 'remote')
  return true
}
