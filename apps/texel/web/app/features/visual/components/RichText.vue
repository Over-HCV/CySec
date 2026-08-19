<script setup lang="ts">
/**
 * Campo de texto con formato: negrita, cursiva y código, sin ver LaTeX.
 *
 * Se escribe encima de un `contenteditable`, no de un `<textarea>`, porque hay
 * que pintar el formato mientras se escribe. Lo que se guarda sigue siendo
 * LaTeX: al soltar el campo se convierte el HTML a marcas (`\textbf{…}`) y se
 * escribe **solo el rango de ese campo**, como cualquier otro bloque.
 *
 * Tres reglas que no se negocian:
 *
 * 1. **Nada se pierde.** Lo que el editor no sabe representar (`\cite{…}`, un
 *    comentario) se pinta como una ficha gris que no se puede editar por dentro
 *    y se devuelve tal cual estaba.
 * 2. **Mientras tiene el foco, manda el campo** — mientras el documento diga lo
 *    que el campo escribió. No se repinta con cada reparseo, o el cursor
 *    saltaría al principio a media palabra; pero si lo que llega **no** es lo
 *    que guardamos, el documento manda y el campo se recoloca encima con el
 *    cursor donde estaba. Sin esa segunda mitad, un guardado que parta el
 *    bloque en dos deja al campo escribiendo sobre un rango que ya no es el
 *    suyo, y el siguiente guardado duplica todo lo que quedó detrás.
 * 3. **El cursor es una posición del documento**, no de un componente. Los
 *    bloques se recrean enteros en cada cambio; el texto no. Ver `caret`.
 */
import {
  latexOffsetOfPlain, parseInline, plainOffsetOfLatex, serializeInline, type InlineNode
} from '../lib/inline'
import { useFormatting, type FormatCommand, type FormatTarget } from '../composables/useFormatting'

const props = defineProps<{
  value: string
  placeholder?: string
  disabled?: boolean
  problem?: string
  /**
   * Vaciar el campo después de guardar. Lo usa la línea que cierra cada
   * contenedor: escribes, se añade al documento y la línea vuelve a estar libre
   * para lo siguiente. Sin esto, el guardado por tiempo y el de al salir del
   * campo escribían el mismo texto dos veces.
   */
  clearOnCommit?: boolean
  /**
   * El cursor va aquí: offset en el LaTeX de este campo, o `null` si no toca.
   * Lo pone quien escribió en el documento, y el campo lo reclama al pintarse.
   */
  caret?: number | null
}>()

const emit = defineEmits<{
  commit: [string]
  /** Enter: el texto de antes del cursor y el de después, ya en LaTeX. */
  split: [string, string]
  /** Ya se ha colocado el cursor; quien lo pidió puede olvidarse. */
  caretTaken: []
}>()

/** Espera antes de escribir en el documento mientras se teclea. */
const COMMIT_MS = 300

const host = ref<HTMLElement>()
const focused = ref(false)
const formatting = useFormatting()
let timer: ReturnType<typeof setTimeout> | null = null
/**
 * Lo último que este campo mandó al documento. Es lo que distingue «el
 * documento dice lo que escribí» de «el documento dice otra cosa», que es la
 * única señal fiable de que hay que recolocarse (regla 2).
 */
let written: string | null = null

/** Aviso propio: lo que no se pudo guardar por no saber releerlo. */
const refused = ref<string | null>(null)
const notice = computed(() => props.problem ?? refused.value ?? undefined)

/** Caracteres que en LaTeX no se pueden escribir tal cual. */
const ESCAPE_OUT: Record<string, string> = {
  '%': '\\%',
  '&': '\\&',
  '_': '\\_',
  '#': '\\#',
  '$': '\\$',
  '{': '\\{',
  '}': '\\}',
  '\\': '\\textbackslash ',
  '~': '\\textasciitilde '
}

const MARK_TAG: Record<string, string> = { bold: 'strong', italic: 'em', code: 'code' }

// ── Pintar ────────────────────────────────────────────────────────────────────

function render(latex: string) {
  if (!host.value) return
  host.value.replaceChildren(...toDom(parseInline(latex)))
}

function toDom(nodes: InlineNode[]): Node[] {
  const out: Node[] = []
  for (const node of nodes) {
    if (node.kind === 'text') {
      out.push(document.createTextNode(node.value))
    } else if (node.kind === 'escape') {
      // El texto de origen viaja con el nodo: así `\ldots` vuelve a ser
      // `\ldots` y no los tres puntos sueltos que se ven en pantalla.
      const span = document.createElement('span')
      span.dataset.src = node.source
      span.textContent = node.value
      out.push(span)
    } else if (node.kind === 'opaque') {
      const chip = document.createElement('span')
      // Un comentario no se imprime en el PDF, así que aquí es una marca
      // mínima: está, se conserva y no estorba la lectura.
      const isComment = node.label === 'comentario'
      chip.className = isComment ? 'mark-comment' : 'chip'
      chip.contentEditable = 'false'
      chip.dataset.src = node.source
      chip.textContent = isComment ? '·' : node.label
      chip.title = node.source
      out.push(chip)
    } else {
      const el = document.createElement(MARK_TAG[node.mark]!)
      el.dataset.cmd = node.cmd
      el.append(...toDom(node.children))
      out.push(el)
    }
  }
  return out
}

// ── Leer de vuelta ────────────────────────────────────────────────────────────

/** HTML → LaTeX. Es la mitad delicada: aquí se decide qué se guarda. */
function fromDom(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? '')

  if (!(node instanceof HTMLElement)) return ''
  if (node.tagName === 'BR') return '\n'
  // Ficha opaca o carácter escapado: se devuelve su origen intacto.
  if (node.dataset.src !== undefined) return node.dataset.src

  const inner = [...node.childNodes].map(fromDom).join('')
  const tag = node.tagName
  if (tag === 'STRONG' || tag === 'B') return `\\${node.dataset.cmd ?? 'textbf'}{${inner}}`
  if (tag === 'EM' || tag === 'I') return `\\${node.dataset.cmd ?? 'emph'}{${inner}}`
  if (tag === 'CODE') return `\\${node.dataset.cmd ?? 'texttt'}{${inner}}`
  // Un `div`/`p` que meta el navegador al pulsar Enter es un salto de línea.
  if (tag === 'DIV' || tag === 'P') return `\n${inner}`
  return inner
}

function escapeText(text: string): string {
  return [...text].map(c => ESCAPE_OUT[c] ?? c).join('')
}

function currentValue(): string {
  if (!host.value) return props.value
  return [...host.value.childNodes].map(fromDom).join('')
}

// ── El cursor ─────────────────────────────────────────────────────────────────

/**
 * El cursor se mide en **caracteres de pantalla**, no de LaTeX: es lo único que
 * el DOM sabe contar. La conversión a offsets del archivo vive en `inline.ts`,
 * donde se puede probar sin navegador.
 *
 * Lo que cuenta cada nodo tiene que ser lo mismo que `toDom` pinta: una ficha
 * vale lo que se lee de ella, no lo que lleva dentro.
 */
function plainLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').length
  if (!(node instanceof HTMLElement)) return 0
  if (node.tagName === 'BR') return 1
  if (node.dataset.src !== undefined) return (node.textContent ?? '').length
  const own = node.tagName === 'DIV' || node.tagName === 'P' ? 1 : 0
  return own + [...node.childNodes].reduce((n, child) => n + plainLength(child), 0)
}

/** Un nodo se cuenta entero o no se cuenta: una ficha no se parte por dentro. */
function atomic(node: Node): boolean {
  return node.nodeType !== Node.TEXT_NODE
    && node instanceof HTMLElement
    && (node.tagName === 'BR' || node.dataset.src !== undefined)
}

/** Posición del cursor dentro del campo, en caracteres de pantalla. */
function plainCaret(): number | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || !host.value) return null
  const range = selection.getRangeAt(0)
  if (!host.value.contains(range.endContainer)) return null

  let total = 0
  let done = false

  const walk = (node: Node) => {
    if (done) return
    const isTarget = node === range.endContainer
    if (isTarget && node.nodeType === Node.TEXT_NODE) {
      total += range.endOffset
      done = true
      return
    }
    if (node.nodeType === Node.TEXT_NODE) {
      total += (node.textContent ?? '').length
      return
    }
    if (atomic(node)) { total += plainLength(node); return }

    const el = node as HTMLElement
    if (el !== host.value && (el.tagName === 'DIV' || el.tagName === 'P')) total += 1

    const children = [...el.childNodes]
    const limit = isTarget ? Math.min(range.endOffset, children.length) : children.length
    for (let i = 0; i < limit; i++) {
      walk(children[i]!)
      if (done) return
    }
    if (isTarget) done = true
  }

  walk(host.value)
  return total
}

/** Deja el cursor en esa posición de pantalla. Cuenta igual que `plainCaret`. */
function placePlainCaret(offset: number) {
  if (!host.value) return
  let left = Math.max(0, offset)
  let point: { node: Node, offset: number } | null = null

  const walk = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = (node.textContent ?? '').length
      if (left <= length) { point = { node, offset: left }; return true }
      left -= length
      return false
    }
    if (atomic(node)) {
      const length = plainLength(node)
      if (left < length) {
        const parent = node.parentNode!
        point = { node: parent, offset: [...parent.childNodes].indexOf(node as ChildNode) }
        return true
      }
      left -= length
      return false
    }
    if (!(node instanceof HTMLElement)) return false
    if (node !== host.value && (node.tagName === 'DIV' || node.tagName === 'P')) {
      if (left < 1) { point = { node, offset: 0 }; return true }
      left -= 1
    }
    return [...node.childNodes].some(walk)
  }

  walk(host.value)
  const target = point ?? { node: host.value, offset: host.value.childNodes.length }

  const range = document.createRange()
  range.setStart(target.node, target.offset)
  range.collapse(true)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

/** El último cursor reclamado, para no repintar dos veces por el mismo. */
let taken: number | null = null

/** Reclama el cursor que alguien dejó pedido en este campo. */
function takeCaret(at: number) {
  if (!host.value || taken === at) return
  taken = at
  render(props.value)
  host.value.focus()
  placePlainCaret(plainOffsetOfLatex(props.value, at))
  emit('caretTaken')
}

watch(() => props.caret, (at) => {
  if (at === null || at === undefined) return
  // Dos campos vecinos comparten el borde, así que los dos pueden creerse
  // dueños del mismo offset. Se mira otra vez al pintar: el primero que lo
  // reclama lo borra, y para el segundo ya no hay nada que reclamar.
  void nextTick(() => {
    if (props.caret === null || props.caret === undefined) return
    takeCaret(props.caret)
  })
}, { immediate: true })

// ── Guardar ───────────────────────────────────────────────────────────────────

function onInput() {
  refused.value = null
  if (timer) clearTimeout(timer)
  timer = setTimeout(commit, COMMIT_MS)
  formatting.refresh()
}

/** ¿Se puede releer lo que se va a guardar y sale exactamente igual? */
function readable(latex: string): boolean {
  return serializeInline(parseInline(latex)) === latex
}

function commit() {
  if (timer) { clearTimeout(timer); timer = null }
  const next = currentValue()
  if (next === props.value) return

  // Cinturón: lo que se va a guardar tiene que volver a pintarse igual. Si no,
  // es que hay algo que no sabemos representar y es mejor no tocar el archivo
  // — pero hay que decirlo, o las teclas desaparecen sin explicación.
  if (!readable(next)) {
    refused.value = 'Esto no se ha podido guardar. Escríbelo en la pestaña Código.'
    return
  }

  refused.value = null
  written = next
  emit('commit', next)
  if (props.clearOnCommit && host.value) host.value.replaceChildren()
}

/**
 * El documento dice algo que este campo no escribió: manda el documento.
 *
 * Pasa cuando el guardado cambia los límites del propio bloque —una línea en
 * blanco lo parte en dos— y cuando escribe otra persona. En los dos casos el
 * campo tiene que dejar de creerse dueño de un rango que ya no es suyo; el
 * cursor se conserva por posición, que es lo que hacía falta proteger.
 */
function rebase(next: string) {
  const at = plainCaret()
  written = null
  render(next)
  if (at === null || !host.value) return
  placePlainCaret(Math.min(at, plainLength(host.value)))
}

watch(() => props.value, (next) => {
  if (!focused.value) { written = null; render(next); return }
  if (next !== written) rebase(next)
})

onMounted(() => {
  render(props.value)
  if (props.caret !== null && props.caret !== undefined) takeCaret(props.caret)
})
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  formatting.release(target)
})

// ── Formato ───────────────────────────────────────────────────────────────────

const target: FormatTarget = {
  apply(command: FormatCommand) {
    if (props.disabled) return
    host.value?.focus()

    if (command === 'bold') document.execCommand('bold')
    else if (command === 'italic') document.execCommand('italic')
    else if (command === 'clear') document.execCommand('removeFormat')
    else toggleCode()

    onInput()
  },
  active() {
    if (!focused.value) return []
    const out: FormatCommand[] = []
    if (document.queryCommandState('bold')) out.push('bold')
    if (document.queryCommandState('italic')) out.push('italic')
    if (inCode()) out.push('code')
    return out
  }
}

/** ¿El cursor está dentro de un tramo de código? */
function inCode(): boolean {
  const node = window.getSelection()?.anchorNode
  const el = node instanceof HTMLElement ? node : node?.parentElement
  return !!el?.closest('code')
}

/**
 * `code` no tiene comando del navegador, así que se envuelve —o se desenvuelve—
 * la selección a mano.
 */
function toggleCode() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)

  const node = selection.anchorNode
  const existing = (node instanceof HTMLElement ? node : node?.parentElement)?.closest('code')
  if (existing) {
    existing.replaceWith(...existing.childNodes)
    return
  }
  if (range.collapsed) return

  const code = document.createElement('code')
  code.dataset.cmd = 'texttt'
  code.append(range.extractContents())
  range.insertNode(code)
  selection.selectAllChildren(code)
  selection.collapseToEnd()
}

function onFocus() {
  focused.value = true
  taken = null
  formatting.claim(target)
}

function onBlur() {
  focused.value = false
  commit()
  formatting.release(target)
  // Al soltar, el campo vuelve a seguir al documento.
  written = null
  render(props.value)
}

/**
 * Enter parte el párrafo en dos y el cursor se va al de abajo; Mayús+Enter hace
 * un salto de línea dentro del mismo párrafo.
 *
 * Es la distinción de LaTeX —una línea en blanco abre párrafo, un salto suelto
 * no— dicha con las teclas de siempre. Antes Enter caía en el navegador, que
 * mete un `div`; el bloque acababa partido por debajo sin que el campo se
 * enterara, y a partir de ahí cada guardado duplicaba el texto.
 */
function onEnter(event: KeyboardEvent) {
  event.preventDefault()

  // La línea que cierra un contenedor no tiene nada que partir: lo suyo es
  // guardar ya, sin esperar a la pausa.
  if (props.clearOnCommit) { commit(); return }

  const at = plainCaret()
  const value = currentValue()
  if (at === null || !readable(value)) return

  if (timer) { clearTimeout(timer); timer = null }
  const cut = latexOffsetOfPlain(value, at)
  written = null
  emit('split', value.slice(0, cut), value.slice(cut))
}

/** Atajos: los de siempre, más ⌘E para código. */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.isComposing) {
    // Mayús+Enter lo hace el navegador: un `<br>`, que ya es un `\n` al leerlo.
    if (!event.shiftKey && !props.disabled) onEnter(event)
    return
  }
  if (!(event.metaKey || event.ctrlKey)) return
  const key = event.key.toLowerCase()
  if (key !== 'b' && key !== 'i' && key !== 'e') return
  event.preventDefault()
  target.apply(key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'code')
}

/** Al pegar, texto plano: pegar HTML de fuera traería estilos que no son LaTeX. */
function onPaste(event: ClipboardEvent) {
  event.preventDefault()
  const text = event.clipboardData?.getData('text/plain') ?? ''
  document.execCommand('insertText', false, text)
}
</script>

<template>
  <div class="min-w-0 flex-1">
    <div
      ref="host"
      class="rich"
      :class="{ 'rich-bad': notice }"
      :contenteditable="!disabled"
      :data-placeholder="placeholder"
      role="textbox"
      aria-multiline="true"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
      @paste="onPaste"
      @keyup="formatting.refresh()"
      @mouseup="formatting.refresh()"
    />
    <span v-if="notice" class="block text-[11px] text-[var(--danger)]">{{ notice }}</span>
  </div>
</template>

<style scoped>
.rich {
  padding: 1px 5px;
  border: 1px solid transparent;
  border-radius: var(--macvue-ref-radius-5, 5px);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  outline: none;
}
/* Como en Notion: el texto es texto. Al pasar el ratón se insinúa dónde se
   puede escribir, y al escribir no aparece ninguna caja: solo el cursor. */
.rich:hover:not(:focus) { background: var(--bg-hover); }
.rich:focus {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}
.rich:empty::before {
  content: attr(data-placeholder);
  color: var(--text-faint);
}
.rich-bad { border-color: var(--danger); }

.rich :deep(code) {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 0 3px;
  border-radius: 4px;
  background: var(--bg-sunken);
}
/* Lo que no se sabe representar: se ve, se mueve, no se rompe por dentro. */
.rich :deep(.mark-comment) {
  color: var(--text-faint);
  opacity: 0.5;
  cursor: default;
  user-select: all;
}
.rich :deep(.chip) {
  display: inline-block;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--bg-sunken);
  color: var(--text-faint);
  font-family: var(--font-mono);
  font-size: 11px;
  vertical-align: 1px;
  user-select: all;
}
</style>
