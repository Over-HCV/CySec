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
import { assignIds, type Block, type BlockKind, type DocKind, type Field, type Span } from './types'

/** Marca de origen de nuestras transacciones. */
export const VISUAL_ORIGIN = 'visual'

/**
 * El bloque ya no describe el documento: alguien lo cambió entre el pintado y
 * el clic. No se escribe nada.
 *
 * Pasa más de lo que parece: el campo que se estaba escribiendo se guarda con
 * 300 ms de retraso, un cambio ajeno se repinta con 120 ms de retraso, y dos
 * clics seguidos van más rápido que el repintado de Vue. Antes de esta
 * comprobación, cualquiera de los tres escribía en el sitio equivocado y
 * descolocaba el archivo — así se rompió el `main.tex` del taller ws-01.
 */
export const STALE = 'STALE' as const

/** `null` si fue bien; `STALE`; o un mensaje para enseñar en el campo. */
export type EditProblem = string | typeof STALE | null

/** ¿El documento sigue diciendo, en ese rango, exactamente lo que creemos? */
function fresh(text: string, span: Span, expected: string): boolean {
  return text.slice(span.from, span.to) === expected
}

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
export function applyFieldEdit(ytext: Y.Text, field: Field, value: string): EditProblem {
  if (value === field.value) return null
  const problem = checkValue(value)
  if (problem) return problem
  if (!fresh(ytext.toString(), field.span, field.value)) return STALE

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
export function applyBodyEdit(
  ytext: Y.Text,
  block: Block,
  value: string,
  snapshot: string
): EditProblem {
  const from = block.meta?.bodyFrom
  const to = block.meta?.bodyTo
  if (from === undefined || to === undefined) return null
  return applyFieldEdit(ytext, {
    name: 'cuerpo',
    span: { from, to },
    // El valor esperado sale del parseo, no del documento de ahora mismo: es lo
    // que convierte a `applyFieldEdit` en una comprobación de verdad.
    value: snapshot.slice(from, to)
  }, value)
}

/**
 * Renombra el entorno de un contenedor: hay que tocar el nombre del `\begin` y
 * el del `\end` a la vez o el archivo queda roto. Se escribe primero el rango
 * de más adelante, porque escribir el primero desplazaría al segundo.
 */
export function renameEnv(ytext: Y.Text, block: Block, name: string): EditProblem {
  const { nameFrom, nameTo, endNameFrom, endNameTo, env } = block.meta ?? {}
  if (nameFrom === undefined || nameTo === undefined || env === undefined
    || endNameFrom === undefined || endNameTo === undefined) return null
  if (!/^[A-Za-z][A-Za-z0-9*@-]*$/.test(name)) return 'Nombre de entorno no válido'

  const text = ytext.toString()
  if (!fresh(text, { from: nameFrom, to: nameTo }, env)
    || !fresh(text, { from: endNameFrom, to: endNameTo }, env)) return STALE

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

/**
 * Inserta la plantilla de un tipo de bloque. Devuelve dónde queda el cursor, o
 * `STALE` si el sitio donde iba ya no es el que era.
 *
 * `guard` es el rango que tiene que seguir intacto para que `at` signifique lo
 * que significaba: el contenedor dentro del que se añade. Sin `guard` se añade
 * al final del documento, y ahí el sitio se recalcula en vez de comprobarse.
 */
export function insertBlock(
  ytext: Y.Text,
  at: number,
  kind: BlockKind,
  guard?: { span: Span, expected: string }
): number | typeof STALE {
  const template = specOf(kind).template ?? ''
  const caret = template.indexOf('|')
  const body = caret === -1 ? template : template.slice(0, caret) + template.slice(caret + 1)

  if (guard && !fresh(ytext.toString(), guard.span, guard.expected)) return STALE

  ytext.doc!.transact(() => {
    ytext.insert(at, body)
  }, VISUAL_ORIGIN)

  return caret === -1 ? at + body.length : at + caret
}

/** Borra un bloque entero, con sus delimitadores. */
export function removeBlock(ytext: Y.Text, block: Block, snapshot: string): EditProblem {
  const length = block.span.to - block.span.from
  if (length <= 0) return null
  const expected = snapshot.slice(block.span.from, block.span.to)
  if (!fresh(ytext.toString(), block.span, expected)) return STALE

  ytext.doc!.transact(() => {
    ytext.delete(block.span.from, length)
  }, VISUAL_ORIGIN)
  return null
}

/**
 * Marca o desmarca una opción de selección múltiple: `\opcion` ⇄ `\opcion*`.
 * Es un solo carácter, justo tras el nombre del comando.
 */
export function toggleOption(ytext: Y.Text, block: Block, snapshot: string): EditProblem {
  if (block.kind !== 'opcion') return null
  const expected = snapshot.slice(block.span.from, block.span.to)
  if (!fresh(ytext.toString(), block.span, expected)) return STALE

  const star = block.span.from + '\\opcion'.length
  ytext.doc!.transact(() => {
    if (block.flags?.correcta) ytext.delete(star, 1)
    else ytext.insert(star, '*')
  }, VISUAL_ORIGIN)
  return null
}

/** Duplica un bloque justo después de sí mismo. */
export function duplicateBlock(ytext: Y.Text, block: Block, snapshot: string): EditProblem {
  const source = snapshot.slice(block.span.from, block.span.to)
  if (!fresh(ytext.toString(), block.span, source)) return STALE

  ytext.doc!.transact(() => {
    ytext.insert(block.span.to, source)
  }, VISUAL_ORIGIN)
  return null
}

/**
 * Intercambia un bloque con su vecino visible. Se hace como un solo corte y una
 * sola pegada dentro de una transacción, para que nadie vea el documento a
 * medias.
 *
 * Se comprueba el tramo entero que se va a reescribir —los dos bloques y lo que
 * haya entre ellos—, no cada bloque por separado: es exactamente lo que se
 * borra, así que es exactamente lo que tiene que estar intacto.
 */
export function moveBlock(
  ytext: Y.Text,
  blocks: Block[],
  index: number,
  dir: -1 | 1,
  snapshot: string
): EditProblem {
  const target = neighbour(blocks, index, dir)
  if (target === -1) return null

  const a = blocks[Math.min(index, target)]!
  const b = blocks[Math.max(index, target)]!
  const region = { from: a.span.from, to: b.span.to }
  const expected = snapshot.slice(region.from, region.to)
  if (!fresh(ytext.toString(), region, expected)) return STALE

  const between = snapshot.slice(a.span.to, b.span.from)
  const swapped = snapshot.slice(b.span.from, b.span.to)
    + between
    + snapshot.slice(a.span.from, a.span.to)

  ytext.doc!.transact(() => {
    ytext.delete(region.from, region.to - region.from)
    ytext.insert(region.from, swapped)
  }, VISUAL_ORIGIN)
  return null
}

/** Vecino que la interfaz muestra, saltándose los huecos en blanco. */
function neighbour(blocks: Block[], index: number, dir: -1 | 1): number {
  for (let i = index + dir; i >= 0 && i < blocks.length; i += dir) {
    if (!blocks[i]!.flags?.blank) return i
  }
  return -1
}
