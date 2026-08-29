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
import { fillGaps, readGroup, skipSpace, trimSpan } from './scan'
import { ATOMS, KNOWN_COMMANDS, WS_META } from './catalog'
import { isProse } from './inline'

/**
 * Entornos cuyo interior NO se convierte en bloques: tablas, flotantes y
 * verbatim. Se conservan enteros como `raw`, que es lo prometido para «todo lo
 * demás» de la v1. Un entorno desconocido *no* entra aquí: se convierte en un
 * contenedor genérico y se sigue escaneando dentro.
 */
const OPAQUE = new Set([
  'table', 'tabular', 'tabularx', 'longtable', 'center',
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
  return groupMeta(text, groupPreamble(classify(text, blocks)))
}

/**
 * Segunda pasada sobre los huecos: decide si un `raw` es prosa o es LaTeX.
 *
 * Un hueco cuyo texto solo lleva marcas (`\textbf`, `\texttt`, escapes) es un
 * **párrafo** y se edita como texto normal. Lo demás sigue siendo `raw`, pero si
 * dentro hay un macro que el editor sí conoce, es señal de que no se pudo leer
 * —una llave sin cerrar— y se marca para poder avisar en vez de soltar el
 * código en la cara del usuario.
 */
function classify(text: string, blocks: Block[]): Block[] {
  for (const block of blocks) {
    if (block.items) classify(text, block.items)
    if (block.kind !== 'raw' || block.flags?.blank) continue

    const source = text.slice(block.span.from, block.span.to)
    if (isProse(source)) {
      block.kind = 'paragraph'
      // El campo es el texto, no el hueco: los saltos de los bordes separan
      // bloques del archivo y no son de nadie. Ver `trimSpan`.
      const inner = trimSpan(text, block.span)
      block.fields = [{ name: 'texto', span: inner, value: text.slice(inner.from, inner.to) }]
      // Un tramo que solo son comentarios es una nota del autor —los separadores
      // «% — Caso de estudio ———» del taller—, no un párrafo del documento. Se
      // pinta como nota y no como texto vacío.
      if (uncommented(source).trim() === '') block.flags = { ...block.flags, comment: true }
      continue
    }

    // Lo que esté comentado no cuenta: `cysec.cls` explica en sus comentarios
    // cómo se usa `\input{common/…}`, y avisar ahí de un macro «sin cerrar»
    // sería mentir sobre un texto que LaTeX ni mira.
    // Solo cuenta si el macro **abre la línea**. Dentro de otra cosa
    // (`\titleformat{\section}{…}`) es un argumento, no un bloque que se haya
    // intentado escribir, y avisar ahí sería ruido.
    const live = defined(uncommented(source))
    const broken = KNOWN_COMMANDS.find(cmd =>
      new RegExp(`^[ \\t]*\\\\${cmd}\\b`, 'm').test(live)
      || new RegExp(`^[ \\t]*\\\\begin\\{${cmd}\\}`, 'm').test(live))
    if (broken) {
      block.flags = { ...block.flags, broken: true }
      block.meta = { ...block.meta, cmd: broken }
    }
  }
  return blocks
}

/**
 * Agrupa los `\ws*` de `meta.tex` en un bloque «Datos del taller».
 *
 * Igual que el preámbulo: agrupación pura, el bloque abarca exactamente a sus
 * hijos, así que la partición se conserva. Sin esto son cinco macros sueltas
 * que nadie relaciona entre sí.
 */
function groupMeta(text: string, blocks: Block[]): Block[] {
  const first = blocks.findIndex(isWsMeta)
  if (first === -1) return blocks

  let last = first
  for (let i = first; i < blocks.length; i++) {
    if (isWsMeta(blocks[i]!)) last = i
    else if (!blocks[i]!.flags?.blank) break
  }
  if (last === first && blocks.filter(isWsMeta).length < 2) return blocks

  const items = blocks.slice(first, last + 1)
  const group: Block = {
    id: '',
    kind: 'meta',
    span: { from: items[0]!.span.from, to: items[items.length - 1]!.span.to },
    fields: [],
    items,
    meta: { bodyFrom: items[0]!.span.from, bodyTo: items[items.length - 1]!.span.to }
  }
  return [...blocks.slice(0, first), group, ...blocks.slice(last + 1)]
}

function isWsMeta(block: Block): boolean {
  return block.kind === 'atom' && WS_META.has(block.meta?.cmd ?? '')
}

/**
 * Quita las *definiciones* de macros, dejando solo los usos.
 *
 * `cysec.cls` define `\wsnumber` con `\newcommand{\wsnumber}[1]{…}`. Ahí el
 * nombre aparece, pero no se está usando el bloque: avisar de que «le falta
 * cerrar una llave» sería falso.
 */
function defined(text: string): string {
  return text.replace(/\\(?:new|renew|provide)command\s*\*?\s*\{\\[A-Za-z@]+\}/g, '')
    .replace(/\\(?:def|let)\\[A-Za-z@]+/g, '')
    .replace(/\\newenvironment\s*\*?\s*\{[^}]*\}/g, '')
}

/** El texto sin lo que va detrás de un `%` sin escapar: lo que LaTeX sí lee. */
function uncommented(text: string): string {
  return text.split('\n').map((line) => {
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '\\') { i++; continue }
      if (line[i] === '%') return line.slice(0, i)
    }
    return line
  }).join('\n')
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

  if (name.value === 'includegraphics') {
    const graphics = readGraphics(text, name.end, limit)
    if (!graphics) return null
    return block('figura', at, graphics.end, graphics.fields, undefined, undefined, {
      cmd: 'includegraphics'
    })
  }

  const atom = ATOMS[name.value]
  if (atom) return readAtom(text, at, name, atom.arg, limit)

  return null
}

/**
 * Macro con nombre propio: `\makewsheader`, `\wstitle{…}`,
 * `\printbibliography[…]`. Se convierte en un bloque con etiqueta en cristiano
 * y, si lleva un dato dentro, con su campo editable.
 */
function readAtom(
  text: string,
  at: number,
  name: Named,
  arg: 'none' | 'group' | 'option',
  limit: number
): { block: Block, end: number } | null {
  const meta: BlockMeta = { cmd: name.value }

  if (arg === 'group') {
    const group = argument(text, name.end, limit)
    if (!group) return null
    return block('atom', at, group.end, [field(text, 'valor', group.inner)], undefined, undefined, meta)
  }

  if (arg === 'option') {
    // `[…]` es opcional: sin él el bloque sigue siendo válido.
    const start = skipSpace(text, name.end)
    const option = text[start] === '[' ? readGroup(text, start, true, '[', ']') : null
    const end = option && option.end <= limit ? option.end : name.end
    return block('atom', at, end, [], undefined, undefined, meta)
  }

  return block('atom', at, name.end, [], undefined, undefined, meta)
}

/**
 * El `\includegraphics[…]{…}` que empieza tras `after`, con sus campos.
 *
 * `ancho` apunta **solo al número** de `width=0.8\linewidth`: así cambiar el
 * tamaño es un parche de tres caracteres y no reescribe la macro entera. Si no
 * hay opciones, o no hay un `width=`, el campo no existe y la interfaz ofrece
 * el ancho por defecto.
 */
function readGraphics(
  text: string,
  after: number,
  limit: number
): { fields: Field[], end: number } | null {
  const start = skipSpace(text, after)
  const options = text[start] === '[' ? readGroup(text, start, true, '[', ']') : null
  if (options && options.end > limit) return null

  const ruta = argument(text, options ? options.end : after, limit)
  if (!ruta) return null

  const fields = [field(text, 'ruta', ruta.inner)]
  const ancho = options ? widthSpan(text, options.inner) : null
  if (ancho) fields.push(field(text, 'ancho', ancho))
  return { fields, end: ruta.end }
}

/** Rango del número de `width=0.8\linewidth` dentro de los corchetes. */
function widthSpan(text: string, options: Span): Span | null {
  const source = text.slice(options.from, options.to)
  const match = /width\s*=\s*([0-9]*\.?[0-9]+)/.exec(source)
  if (!match) return null
  const from = options.from + match.index + match[0].length - match[1]!.length
  return { from, to: from + match[1]!.length }
}

/**
 * `\begin{figure} … \end{figure}` con una imagen dentro.
 *
 * Es un bloque **hoja**, no un contenedor: su cuerpo no se parte en hijos, así
 * que la identidad «bloque = su substring» se cumple sola y el `\centering`, el
 * `\label` y el `[htbp]` viajan intactos aunque la interfaz no los enseñe.
 */
function readFigure(
  text: string,
  at: number,
  bodyFrom: number,
  close: { bodyEnd: number, end: number, name: Span }
): { block: Block, end: number } | null {
  const graphics = commandAt(text, bodyFrom, close.bodyEnd, 'includegraphics')
  if (graphics === null) return null
  const image = readGraphics(text, graphics.end, close.bodyEnd)
  if (!image) return null

  const fields: Field[] = []
  const caption = commandAt(text, bodyFrom, close.bodyEnd, 'caption')
  if (caption !== null) {
    const pie = argument(text, caption.end, close.bodyEnd)
    if (pie) fields.push(field(text, 'pie', pie.inner))
  }
  fields.push(...image.fields)

  return block('figura', at, close.end, fields, undefined, undefined, {
    env: 'figure',
    cmd: 'includegraphics',
    bodyFrom,
    bodyTo: close.bodyEnd
  })
}

/**
 * Busca una macro por nombre en un tramo, saltando comentarios. Devuelve dónde
 * empieza la barra y dónde acaba el nombre, o `null` si no está.
 */
function commandAt(
  text: string,
  from: number,
  to: number,
  cmd: string
): { at: number, end: number } | null {
  let i = from
  while (i < to) {
    const c = text[i]
    if (c === '%') { i = endOfLine(text, i); continue }
    if (c !== '\\') { i++; continue }
    const name = commandName(text, i)
    if (!name) { i += 2; continue }
    if (name.value === cmd) return { at: i, end: name.end }
    i = name.end
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
    case 'figure': {
      const figura = readFigure(text, at, nameArg.end, close)
      // Un `figure` sin `\includegraphics` —uno dibujado con TikZ, una tabla
      // puesta a flotar— no es una imagen: se conserva entero como antes.
      return figura ?? { block: rawEnv(at, close.end), end: close.end }
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
