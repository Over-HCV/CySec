/**
 * BibTeX → bloques.
 *
 * Gramática de verdad pequeña: `@tipo{clave, campo = valor, …}`. Lo demás
 * (banners de comentario, `@string`, `@preamble`) cae en bloques `raw`.
 *
 * No hay serializador «bonito»: los campos que nadie toca conservan sus bytes,
 * alineación incluida. En `latex/tex/bib/refs.bib` la entrada `avast-forbes`
 * tiene la alineación rota respecto al resto del archivo; reformatearla sería
 * meter ruido en el diff de otra persona.
 */
import type { Block, Field } from './types'
import { fillGaps, field, isEscaped, readGroup } from './scan'

/** Tipos que no son entradas bibliográficas y se dejan como texto crudo. */
const NOT_ENTRIES = new Set(['string', 'preamble', 'comment'])

export function parseBib(text: string): Block[] {
  const found: Block[] = []
  let i = 0

  while (i < text.length) {
    const at = text.indexOf('@', i)
    if (at === -1) break
    if (isEscaped(text, at) || inComment(text, at)) { i = at + 1; continue }

    const entry = readEntry(text, at)
    if (!entry) { i = at + 1; continue }
    found.push(entry)
    i = entry.span.to
  }

  return fillGaps(text, found, 0, text.length)
}

/** ¿El offset cae dentro de un comentario de línea (`%` al principio de línea)? */
function inComment(text: string, i: number): boolean {
  const lineStart = text.lastIndexOf('\n', i - 1) + 1
  for (let j = lineStart; j < i; j++) {
    if (text[j] === '%' && !isEscaped(text, j)) return true
  }
  return false
}

function readEntry(text: string, at: number): Block | null {
  let i = at + 1
  const typeStart = i
  while (i < text.length && /[A-Za-z]/.test(text[i]!)) i++
  const type = text.slice(typeStart, i).toLowerCase()
  if (!type || NOT_ENTRIES.has(type)) return null

  while (i < text.length && /\s/.test(text[i]!)) i++
  const group = readGroup(text, i, false)
  if (!group) return null

  const fields: Field[] = [
    field(text, 'tipo', { from: typeStart, to: typeStart + type.length })
  ]

  // Clave de cita: hasta la primera coma del nivel superior.
  let j = group.inner.from
  while (j < group.inner.to && /\s/.test(text[j]!)) j++
  const keyStart = j
  while (j < group.inner.to && text[j] !== ',') j++
  fields.push(field(text, 'clave', { from: keyStart, to: trimEnd(text, keyStart, j) }))

  if (text[j] === ',') j++
  fields.push(...readFields(text, j, group.inner.to))

  return {
    id: '',
    kind: 'bibEntry',
    span: { from: at, to: group.end },
    fields
  }
}

function readFields(text: string, from: number, to: number): Field[] {
  const out: Field[] = []
  let i = from

  while (i < to) {
    while (i < to && /[\s,]/.test(text[i]!)) i++
    if (i >= to) break

    const nameStart = i
    while (i < to && /[A-Za-z0-9_:.+-]/.test(text[i]!)) i++
    const name = text.slice(nameStart, i)
    if (!name) { i++; continue }

    while (i < to && /\s/.test(text[i]!)) i++
    if (text[i] !== '=') continue
    i++
    while (i < to && /\s/.test(text[i]!)) i++

    const value = readValue(text, i, to)
    if (!value) break
    out.push(field(text, name, value.inner))
    i = value.end
  }

  return out
}

/**
 * Valor de campo: `{…}`, `"…"` o desnudo (número o macro de `@string`). El span
 * devuelto es el del contenido, sin delimitadores: es lo que se edita.
 */
function readValue(text: string, i: number, to: number): { inner: { from: number, to: number }, end: number } | null {
  if (text[i] === '{') return readGroup(text, i, false)
  if (text[i] === '"') {
    for (let j = i + 1; j < to; j++) {
      if (text[j] === '\\') { j++; continue }
      if (text[j] === '"') return { inner: { from: i + 1, to: j }, end: j + 1 }
    }
    return null
  }
  let j = i
  while (j < to && text[j] !== ',' && text[j] !== '\n') j++
  const end = trimEnd(text, i, j)
  if (end === i) return null
  return { inner: { from: i, to: end }, end }
}

function trimEnd(text: string, from: number, to: number): number {
  let j = to
  while (j > from && /\s/.test(text[j - 1]!)) j--
  return j
}
