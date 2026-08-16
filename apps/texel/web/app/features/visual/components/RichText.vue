<script setup lang="ts">
/**
 * Campo de texto con formato: negrita, cursiva y código, sin ver LaTeX.
 *
 * Se escribe encima de un `contenteditable`, no de un `<textarea>`, porque hay
 * que pintar el formato mientras se escribe. Lo que se guarda sigue siendo
 * LaTeX: al soltar el campo se convierte el HTML a marcas (`\textbf{…}`) y se
 * escribe **solo el rango de ese campo**, como cualquier otro bloque.
 *
 * Dos reglas que no se negocian:
 *
 * 1. **Nada se pierde.** Lo que el editor no sabe representar (`\cite{…}`, un
 *    comentario) se pinta como una ficha gris que no se puede editar por dentro
 *    y se devuelve tal cual estaba.
 * 2. **Mientras tiene el foco, manda el campo.** No se repinta con lo que llegue
 *    del documento, o el cursor saltaría al principio a media palabra. Es la
 *    misma disciplina de `BlockField.vue`.
 */
import { parseInline, serializeInline, type InlineNode } from '../lib/inline'
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
}>()

const emit = defineEmits<{ commit: [string] }>()

/** Espera antes de escribir en el documento mientras se teclea. */
const COMMIT_MS = 300

const host = ref<HTMLElement>()
const focused = ref(false)
const formatting = useFormatting()
let timer: ReturnType<typeof setTimeout> | null = null

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

// ── Guardar ───────────────────────────────────────────────────────────────────

function onInput() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(commit, COMMIT_MS)
  formatting.refresh()
}

function commit() {
  if (timer) { clearTimeout(timer); timer = null }
  const next = currentValue()
  if (next === props.value) return

  // Cinturón: lo que se va a guardar tiene que volver a pintarse igual. Si no,
  // es que hay algo que no sabemos representar y es mejor no tocar el archivo.
  if (serializeInline(parseInline(next)) !== next) return
  emit('commit', next)
  if (props.clearOnCommit && host.value) host.value.replaceChildren()
}

watch(() => props.value, (next) => {
  if (!focused.value) render(next)
})

onMounted(() => render(props.value))
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
  formatting.claim(target)
}

function onBlur() {
  focused.value = false
  commit()
  formatting.release(target)
  // Al soltar, el campo vuelve a seguir al documento.
  render(props.value)
}

/** Atajos: los de siempre, más ⌘E para código. */
function onKeydown(event: KeyboardEvent) {
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
      :class="{ 'rich-bad': problem }"
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
    <span v-if="problem" class="block text-[11px] text-[var(--danger)]">{{ problem }}</span>
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
