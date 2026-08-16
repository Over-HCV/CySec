/**
 * Puente entre los bloques y el `Y.Text` `'content'`.
 *
 * Todas las escrituras van en una sola transacción con `origin: 'visual'` y
 * tocan únicamente el rango afectado. Nada de reescribir el documento entero:
 * en un editor colaborativo eso pisaría lo que otra persona tiene a medio
 * escribir en ese mismo instante.
 *
 * El proveedor ya trata bien este origen — `handleLocalUpdate` solo descarta
 * `'remote'` (`features/editor/lib/supabase-yjs-provider.ts`) —, así que el
 * cambio se difunde y se persiste como cualquier otro.
 */
import type * as Y from 'yjs'
import { parseBib } from './parse-bib'
import { parseTex } from './parse-tex'
import { specOf } from './catalog'
import { assignIds, type Block, type BlockKind, type DocKind, type Field } from './types'

/** Marca de origen de nuestras transacciones. */
export const VISUAL_ORIGIN = 'visual'

export function parseDoc(text: string, kind: DocKind): Block[] {
  return assignIds(kind === 'bib' ? parseBib(text) : parseTex(text))
}

/**
 * ¿Se puede escribir este valor sin romper el documento para todos?
 *
 * Un valor con llaves descompensadas no solo estropea el bloque de quien
 * escribe: deja el `.tex` sin compilar para el resto. Es más barato negarse y
 * avisar que reparar después.
 */
export function checkValue(value: string): string | null {
  let depth = 0
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (c === '\\') { i++; continue }
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth < 0) return 'Sobra una llave de cierre «}»' }
  }
  if (depth > 0) return 'Falta cerrar una llave «{»'
  return null
}

/**
 * Reemplaza el valor de un campo. Solo se borra e inserta el rango del campo:
 * el resto del documento no se toca, ni siquiera el resto del bloque.
 */
export function applyFieldEdit(ytext: Y.Text, field: Field, value: string): string | null {
  if (value === field.value) return null
  const problem = checkValue(value)
  if (problem) return problem

  const length = field.span.to - field.span.from
  ytext.doc!.transact(() => {
    if (length > 0) ytext.delete(field.span.from, length)
    if (value.length > 0) ytext.insert(field.span.from, value)
  }, VISUAL_ORIGIN)
  return null
}

/**
 * Reemplaza el cuerpo entero de un contenedor (lo que hay entre su `\begin` y
 * su `\end`). Es la vía para escribir dentro de un contenedor vacío, donde
 * todavía no hay ningún hijo al que apuntar.
 */
export function applyBodyEdit(ytext: Y.Text, block: Block, value: string): string | null {
  const from = block.meta?.bodyFrom
  const to = block.meta?.bodyTo
  if (from === undefined || to === undefined) return null
  return applyFieldEdit(ytext, {
    name: 'cuerpo',
    span: { from, to },
    value: ytext.toString().slice(from, to)
  }, value)
}

/**
 * Renombra el entorno de un contenedor: hay que tocar el nombre del `\begin` y
 * el del `\end` a la vez o el archivo queda roto. Se escribe primero el rango
 * de más adelante, porque escribir el primero desplazaría al segundo.
 */
export function renameEnv(ytext: Y.Text, block: Block, name: string): string | null {
  const { nameFrom, nameTo, endNameFrom, endNameTo } = block.meta ?? {}
  if (nameFrom === undefined || nameTo === undefined
    || endNameFrom === undefined || endNameTo === undefined) return null
  if (!/^[A-Za-z][A-Za-z0-9*@-]*$/.test(name)) return 'Nombre de entorno no válido'

  ytext.doc!.transact(() => {
    ytext.delete(endNameFrom, endNameTo - endNameFrom)
    ytext.insert(endNameFrom, name)
    ytext.delete(nameFrom, nameTo - nameFrom)
    ytext.insert(nameFrom, name)
  }, VISUAL_ORIGIN)
  return null
}

/**
 * Punto de inserción para un hijo nuevo: detrás del último hijo, o al principio
 * del cuerpo si el contenedor está vacío.
 */
export function insideOf(container: Block): number | null {
  const items = container.items ?? []
  if (items.length) return items[items.length - 1]!.span.to
  return container.meta?.bodyFrom ?? null
}

/** Inserta la plantilla de un tipo de bloque. Devuelve dónde queda el cursor. */
export function insertBlock(ytext: Y.Text, at: number, kind: BlockKind): number {
  const template = specOf(kind).template ?? ''
  const caret = template.indexOf('|')
  const body = caret === -1 ? template : template.slice(0, caret) + template.slice(caret + 1)

  ytext.doc!.transact(() => {
    ytext.insert(at, body)
  }, VISUAL_ORIGIN)

  return caret === -1 ? at + body.length : at + caret
}

/** Borra un bloque entero, con sus delimitadores. */
export function removeBlock(ytext: Y.Text, block: Block): void {
  const length = block.span.to - block.span.from
  if (length <= 0) return
  ytext.doc!.transact(() => {
    ytext.delete(block.span.from, length)
  }, VISUAL_ORIGIN)
}

/**
 * Marca o desmarca una opción de selección múltiple: `\opcion` ⇄ `\opcion*`.
 * Es un solo carácter, justo tras el nombre del comando.
 */
export function toggleOption(ytext: Y.Text, block: Block): void {
  if (block.kind !== 'opcion') return
  const star = block.span.from + '\\opcion'.length
  ytext.doc!.transact(() => {
    if (block.flags?.correcta) ytext.delete(star, 1)
    else ytext.insert(star, '*')
  }, VISUAL_ORIGIN)
}

/** Duplica un bloque justo después de sí mismo. */
export function duplicateBlock(ytext: Y.Text, block: Block): void {
  const source = ytext.toString().slice(block.span.from, block.span.to)
  ytext.doc!.transact(() => {
    ytext.insert(block.span.to, source)
  }, VISUAL_ORIGIN)
}

/**
 * Intercambia un bloque con su vecino visible. Se hace como un solo corte y una
 * sola pegada dentro de una transacción, para que nadie vea el documento a
 * medias.
 */
export function moveBlock(ytext: Y.Text, blocks: Block[], index: number, dir: -1 | 1): void {
  const target = neighbour(blocks, index, dir)
  if (target === -1) return

  const a = blocks[Math.min(index, target)]!
  const b = blocks[Math.max(index, target)]!
  const text = ytext.toString()
  const between = text.slice(a.span.to, b.span.from)
  const swapped = text.slice(b.span.from, b.span.to) + between + text.slice(a.span.from, a.span.to)

  ytext.doc!.transact(() => {
    ytext.delete(a.span.from, b.span.to - a.span.from)
    ytext.insert(a.span.from, swapped)
  }, VISUAL_ORIGIN)
}

/** Vecino que la interfaz muestra, saltándose los huecos en blanco. */
function neighbour(blocks: Block[], index: number, dir: -1 | 1): number {
  for (let i = index + dir; i >= 0 && i < blocks.length; i += dir) {
    if (!blocks[i]!.flags?.blank) return i
  }
  return -1
}
