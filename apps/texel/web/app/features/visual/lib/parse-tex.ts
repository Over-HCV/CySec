/**
 * LaTeX → bloques.
 *
 * Solo reconoce las macros y entornos de `cysec.cls` (ver
 * `latex/tex/common/{boxes,macros}.tex`); lo demás cae en bloques `raw` que
 * conservan su texto literal. No hay AST: se recorre el texto una vez anotando
 * offsets, y un bloque intacto sigue siendo su propio substring.
 *
 * La superficie es pequeña a propósito: la clase no usa xparse, tiene un único
 * comando estrellado (`\opcion*`) y un único argumento opcional (`\todoans[]`).
 */
import type { Block, BlockMeta, Field, Span } from './types'
import { fillGaps, readGroup, skipSpace } from './scan'

/**
 * Entornos cuyo interior NO se convierte en bloques: tablas, flotantes y
 * verbatim. Se conservan enteros como `raw`, que es lo prometido para «todo lo
 * demás» de la v1. Un entorno desconocido *no* entra aquí: se convierte en un
 * contenedor genérico y se sigue escaneando dentro.
 */
const OPAQUE = new Set([
  'table', 'tabular', 'tabularx', 'longtable', 'figure', 'center',
  'verbatim', 'lstlisting', 'minted', 'equation', 'align', 'displaymath',
  'tcolorbox', 'porquebox'
])

const SECTION_LEVEL: Record<string, number> = {
  section: 1,
  subsection: 2,
  subsubsection: 3
}

export function parseTex(text: string): Block[] {
  const blocks = fillGaps(text, scanRange(text, 0, text.length), 0, text.length)
  return groupPreamble(blocks)
}

/**
 * Mete todo lo anterior a `\begin{document}` en un solo bloque `preamble`.
 *
 * Es agrupación pura: el bloque abarca exactamente a sus hijos, así que la
 * partición se conserva. Sirve para que la interfaz pueda plegar de una vez el
 * `\documentclass` y los `\usepackage`, que es andamiaje, no contenido.
 */
function groupPreamble(blocks: Block[]): Block[] {
  const i = blocks.findIndex(b => b.kind === 'env' && b.meta?.env === 'document')
  if (i <= 0) return blocks

  const head = blocks.slice(0, i)
  const preamble: Block = {
    id: '',
    kind: 'preamble',
    span: { from: head[0]!.span.from, to: head[head.length - 1]!.span.to },
    fields: [],
    items: head,
    meta: { bodyFrom: head[0]!.span.from, bodyTo: head[head.length - 1]!.span.to }
  }
  return [preamble, ...blocks.slice(i)]
}

/** Bloques reconocidos dentro de `[from, to)`, en orden y sin solaparse. */
function scanRange(text: string, from: number, to: number): Block[] {
  const found: Block[] = []
  let i = from

  while (i < to) {
    const c = text[i]

    if (c === '%') { i = endOfLine(text, i); continue }
    if (c !== '\\') { i++; continue }

    const name = commandName(text, i)
    if (!name) { i += 2; continue }

    const block = readCommand(text, i, name, to)
    if (block) {
      found.push(block.block)
      i = block.end
      continue
    }
    i = name.end
  }

  return found
}

interface Named { value: string, starred: boolean, end: number }

/** Nombre del comando que empieza en la barra de `i`, con su estrella. */
function commandName(text: string, i: number): Named | null {
  let j = i + 1
  const start = j
  while (j < text.length && /[A-Za-z]/.test(text[j]!)) j++
  if (j === start) return null
  const value = text.slice(start, j)
  const starred = text[j] === '*'
  return { value, starred, end: starred ? j + 1 : j }
}

function readCommand(
  text: string,
  at: number,
  name: Named,
  limit: number
): { block: Block, end: number } | null {
  if (name.value === 'begin') return readEnvironment(text, at, name.end, limit)

  if (name.value in SECTION_LEVEL) {
    const arg = argument(text, name.end, limit)
    if (!arg) return null
    return block('section', at, arg.end, [
      field(text, 'titulo', arg.inner)
    ], { starred: name.starred }, undefined, { nivel: SECTION_LEVEL[name.value]! })
  }

  if (name.value === 'pregunta') {
    const arg = argument(text, name.end, limit)
    if (!arg) return null
    return block('pregunta', at, arg.end, [field(text, 'enunciado', arg.inner)])
  }

  if (name.value === 'input' || name.value === 'include') {
    const arg = argument(text, name.end, limit)
    if (!arg) return null
    return block('input', at, arg.end, [field(text, 'ruta', arg.inner)])
  }

  if (name.value === 'porque') {
    const titulo = argument(text, name.end, limit)
    if (!titulo) return null
    const texto = argument(text, titulo.end, limit)
    if (!texto) return null
    return block('porque', at, texto.end, [
      field(text, 'titulo', titulo.inner),
      field(text, 'texto', texto.inner)
    ])
  }

  if (name.value === 'fuente') {
    const arg = argument(text, name.end, limit)
    if (!arg) return null
    return block('fuente', at, arg.end, [field(text, 'url', arg.inner)])
  }

  if (name.value === 'opcion') {
    const arg = argument(text, name.end, limit)
    if (!arg) return null
    return block('opcion', at, arg.end, [field(text, 'texto', arg.inner)], {
      correcta: name.starred
    })
  }

  return null
}

function readEnvironment(
  text: string,
  at: number,
  afterBegin: number,
  limit: number
): { block: Block, end: number } | null {
  const nameArg = argument(text, afterBegin, limit)
  if (!nameArg) return null
  const env = text.slice(nameArg.inner.from, nameArg.inner.to).trim()
  const close = findEnd(text, nameArg.end, env, limit)
  if (!close) return null

  if (OPAQUE.has(env)) {
    // Reconocido lo justo para no mirar dentro; sale como un `raw` porque
    // `scanRange` no lo añade a los encontrados… salvo que lo devolvamos.
    return { block: rawEnv(at, close.end), end: close.end }
  }

  /** Un entorno es un contenedor: sus argumentos son campos y su cuerpo, hijos. */
  const container = (
    kind: Block['kind'],
    fields: Field[],
    bodyFrom: number
  ): { block: Block, end: number } => {
    const items = fillGaps(
      text,
      scanRange(text, bodyFrom, close.bodyEnd),
      bodyFrom,
      close.bodyEnd
    )
    return block(kind, at, close.end, fields, undefined, items, {
      env,
      bodyFrom,
      bodyTo: close.bodyEnd,
      nameFrom: nameArg.inner.from,
      nameTo: nameArg.inner.to,
      endNameFrom: close.name.from,
      endNameTo: close.name.to
    })
  }

  switch (env) {
    case 'caso': {
      const titulo = argument(text, nameArg.end, close.bodyEnd)
      if (!titulo) return null
      return container('caso', [field(text, 'titulo', titulo.inner)], titulo.end)
    }
    case 'respuesta':
      return container('respuesta', [], nameArg.end)
    case 'fuentes':
      return container('fuentes', [], nameArg.end)
    case 'mcq': {
      const enunciado = argument(text, nameArg.end, close.bodyEnd)
      if (!enunciado) return null
      return container('mcq', [field(text, 'enunciado', enunciado.inner)], enunciado.end)
    }
  }

  // Entorno sin ficha propia (`document`, `itemize`, `abstract`…): contenedor
  // genérico. Los `{…}` que vengan en la misma línea que el `\begin` son sus
  // entradas; el resto es cuerpo, y dentro se sigue escaneando.
  const args = sameLineArgs(text, nameArg.end, close.bodyEnd)
  const bodyFrom = args.length ? args[args.length - 1]!.end : nameArg.end
  const fields = args.map((arg, i) => field(text, `arg${i + 1}`, arg.inner))
  return container('env', fields, bodyFrom)
}

/**
 * Grupos `{…}` consecutivos a partir de `i`, **sin cruzar un salto de línea**.
 *
 * La restricción es lo que separa un argumento del entorno de un `{` que en
 * realidad abría el cuerpo: `\begin{mio}{título}` sí, pero `\begin{mio}\n{esto
 * es contenido}` no.
 */
function sameLineArgs(text: string, i: number, limit: number): { inner: Span, end: number }[] {
  const out: { inner: Span, end: number }[] = []
  let j = i
  for (;;) {
    let k = j
    while (k < limit && (text[k] === ' ' || text[k] === '\t')) k++
    if (k >= limit || text[k] !== '{') break
    const group = readGroup(text, k)
    if (!group || group.end > limit) break
    out.push(group)
    j = group.end
  }
  return out
}

/**
 * Localiza el `\end{env}` que cierra este entorno, contando anidamientos del
 * mismo nombre y saltando comentarios.
 */
function findEnd(
  text: string,
  from: number,
  env: string,
  limit: number
): { bodyStart: number, bodyEnd: number, end: number, name: Span } | null {
  let depth = 1
  let i = from

  while (i < limit) {
    const c = text[i]
    if (c === '%') { i = endOfLine(text, i); continue }
    if (c !== '\\') { i++; continue }
    const name = commandName(text, i)
    if (!name || (name.value !== 'begin' && name.value !== 'end')) {
      i = name ? name.end : i + 2
      continue
    }
    const arg = argument(text, name.end, limit)
    if (!arg) { i = name.end; continue }
    if (text.slice(arg.inner.from, arg.inner.to).trim() !== env) { i = arg.end; continue }

    if (name.value === 'begin') { depth++; i = arg.end; continue }
    depth--
    if (depth === 0) return { bodyStart: from, bodyEnd: i, end: arg.end, name: arg.inner }
    i = arg.end
  }

  return null
}

/** Argumento obligatorio `{…}` tras saltar espacios que no crucen un `\par`. */
function argument(text: string, i: number, limit: number): { inner: { from: number, to: number }, end: number } | null {
  const start = skipSpace(text, i)
  if (start >= limit) return null
  const group = readGroup(text, start)
  if (!group || group.end > limit) return null
  return group
}

function endOfLine(text: string, i: number): number {
  const nl = text.indexOf('\n', i)
  return nl === -1 ? text.length : nl + 1
}

function field(text: string, name: string, span: { from: number, to: number }): Field {
  return { name, span, value: text.slice(span.from, span.to) }
}

function block(
  kind: Block['kind'],
  from: number,
  to: number,
  fields: Field[],
  flags?: Record<string, boolean>,
  items?: Block[],
  meta?: BlockMeta
): { block: Block, end: number } {
  const b: Block = { id: '', kind, span: { from, to }, fields }
  if (flags) b.flags = flags
  if (items) b.items = items
  if (meta) b.meta = meta
  return { block: b, end: to }
}

function rawEnv(from: number, to: number): Block {
  return { id: '', kind: 'raw', span: { from, to }, fields: [] }
}
