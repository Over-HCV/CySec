<script setup lang="ts">
import * as Y from 'yjs'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { StreamLanguage, syntaxHighlighting, HighlightStyle, indentUnit } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { yCollab } from 'y-codemirror.next'
import { SupabaseYjsProvider, type ProviderUser } from '../lib/supabase-yjs-provider'
import type { Diagnostic } from '~/shared/types/database'

const props = defineProps<{
  fileId: string
  canWrite: boolean
  user: ProviderUser
  /** Ajuste de línea. Apagado, el editor scrollea en horizontal él solo. */
  wrap?: boolean
  /** Diagnósticos de la última compilación, para subrayar líneas con error. */
  diagnostics?: Diagnostic[]
}>()

const emit = defineEmits<{
  peers: [ProviderUser[]]
  /** El cursor se movió: lo usa SyncTeX para el salto directo. */
  cursorLine: [number]
  ready: [SupabaseYjsProvider]
}>()

const supabase = useSupabaseClient()
const host = ref<HTMLElement>()
const loading = ref(true)

let view: EditorView | null = null
let provider: SupabaseYjsProvider | null = null
let doc: Y.Doc | null = null
const editable = new Compartment()
const wrapping = new Compartment()

// Los colores salen del tema (CSS vars), no de un tema JS de CodeMirror: así
// claro y oscuro cambian con el sistema sin recrear el editor.
const baseTheme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-content': { padding: '8px 0' },
  '.cm-line': { padding: '0 12px' }
})

// Resaltado propio: el de serie de CodeMirror pinta los comandos en azul
// oscuro, que sobre un fondo oscuro no hay quien lo lea. Estos tonos están
// elegidos para tener contraste suficiente sobre el grafito del editor.
const syntax = HighlightStyle.define([
  { tag: t.comment, color: 'var(--code-comment)', fontStyle: 'italic' },
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: 'var(--code-keyword)' },
  { tag: [t.tagName, t.function(t.variableName), t.macroName], color: 'var(--code-command)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--code-string)' },
  { tag: [t.number, t.bool, t.atom], color: 'var(--code-number)' },
  { tag: [t.bracket, t.brace, t.paren, t.punctuation], color: 'var(--code-punct)' },
  { tag: [t.attributeName, t.propertyName, t.labelName], color: 'var(--code-attr)' },
  { tag: [t.typeName, t.className, t.namespace], color: 'var(--code-type)' },
  { tag: t.link, color: 'var(--code-link)', textDecoration: 'underline' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: '600' },
  { tag: t.invalid, color: 'var(--danger)' }
])

async function mountEditor() {
  if (!host.value) return

  doc = new Y.Doc()
  provider = new SupabaseYjsProvider(doc, {
    supabase,
    fileId: props.fileId,
    user: props.user,
    canWrite: props.canWrite,
    onPeers: peers => emit('peers', peers),
    onSynced: () => { loading.value = false }
  })
  await provider.connect()

  const ytext = doc.getText('content')

  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: ytext.toString(),
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        indentUnit.of('  '),
        StreamLanguage.define(stex),
        syntaxHighlighting(syntax, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        // yCollab enlaza el texto, el undo compartido y los cursores remotos.
        yCollab(ytext, provider.awareness),
        baseTheme,
        wrapping.of(props.wrap === false ? [] : EditorView.lineWrapping),
        editable.of(EditorView.editable.of(props.canWrite)),
        EditorView.updateListener.of((u) => {
          if (!u.selectionSet) return
          const line = u.state.doc.lineAt(u.state.selection.main.head).number
          emit('cursorLine', line)
        })
      ]
    })
  })

  emit('ready', provider)
}

/**
 * Cierra el editor del archivo `fileId`.
 *
 * El orden importa y por eso es asíncrono: primero se espera a que el proveedor
 * escriba en el log lo último que se tecleó, y solo después se invoca
 * `flush-doc`. Al revés, la función compacta sin ver esos últimos segundos y
 * los da por podados.
 */
async function teardown(fileId: string) {
  view?.destroy()
  view = null
  const closing = provider?.destroy()
  provider = null
  await closing

  doc?.destroy()
  doc = null

  // Compacta el log de Yjs y vuelca el texto plano a files.content. Si falla
  // (sin red, función no desplegada) no pasa nada: el log sigue ahí y la
  // siguiente apertura reconstruye igual.
  if (props.canWrite) {
    void supabase.functions.invoke('flush-doc', { body: { fileId } }).catch(() => {})
  }
}

onMounted(mountEditor)
onBeforeUnmount(() => { void teardown(props.fileId) })

// Cambiar de archivo = documento Yjs distinto: se desmonta y se vuelve a montar.
// `previous` y no `props.fileId`: aquí el prop ya vale el archivo nuevo, y hay
// que cerrar el viejo.
watch(() => props.fileId, async (_next, previous) => {
  loading.value = true
  await teardown(previous)
  await nextTick()
  await mountEditor()
})

watch(() => props.canWrite, (can) => {
  view?.dispatch({ effects: editable.reconfigure(EditorView.editable.of(can)) })
})

watch(() => props.wrap, (on) => {
  view?.dispatch({ effects: wrapping.reconfigure(on === false ? [] : EditorView.lineWrapping) })
})

// El nombre y el color salen de `profiles`, que se lee de la base después de
// montar el editor. Sin volver a publicarlos, los demás se quedan con lo que
// hubiera al conectar: el correo, o «Anónimo» si la sesión aún no había cargado.
watch(() => props.user, (user) => provider?.setUser(user), { deep: true })

/** Coloca el cursor en una línea (salto inverso desde el PDF). */
function goToLine(line: number) {
  if (!view) return
  const l = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines))
  view.dispatch({ selection: { anchor: l.from }, scrollIntoView: true })
  view.focus()
}

/**
 * CodeMirror mide mal si estaba oculto (`display: none`) al cambiar de pestaña:
 * se queda con las dimensiones de entonces. La página avisa al volver a Código.
 */
function remeasure() {
  view?.requestMeasure()
}

defineExpose({ goToLine, remeasure, getText: () => provider?.text ?? '' })
</script>

<template>
  <div class="relative h-full pane">
    <div ref="host" class="h-full pane overflow-hidden" />
    <div
      v-if="loading"
      class="absolute inset-0 grid place-items-center bg-[var(--bg)] text-[var(--text-muted)] text-xs"
    >
      Cargando documento…
    </div>
  </div>
</template>
