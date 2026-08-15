<script setup lang="ts">
import * as Y from 'yjs'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { StreamLanguage, syntaxHighlighting, defaultHighlightStyle, indentUnit } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { yCollab } from 'y-codemirror.next'
import { SupabaseYjsProvider, type ProviderUser } from '../lib/supabase-yjs-provider'
import type { Diagnostic } from '~/shared/types/database'

const props = defineProps<{
  fileId: string
  canWrite: boolean
  user: ProviderUser
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
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        // yCollab enlaza el texto, el undo compartido y los cursores remotos.
        yCollab(ytext, provider.awareness),
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

function teardown() {
  const fileId = props.fileId
  view?.destroy()
  view = null
  provider?.destroy()
  provider = null
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
onBeforeUnmount(teardown)

// Cambiar de archivo = documento Yjs distinto: se desmonta y se vuelve a montar.
watch(() => props.fileId, async () => {
  loading.value = true
  teardown()
  await nextTick()
  await mountEditor()
})

watch(() => props.canWrite, (can) => {
  view?.dispatch({ effects: editable.reconfigure(EditorView.editable.of(can)) })
})

/** Coloca el cursor en una línea (salto inverso desde el PDF). */
function goToLine(line: number) {
  if (!view) return
  const l = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines))
  view.dispatch({ selection: { anchor: l.from }, scrollIntoView: true })
  view.focus()
}

defineExpose({ goToLine, getText: () => provider?.text ?? '' })
</script>

<template>
  <div class="relative h-full">
    <div ref="host" class="h-full overflow-hidden" />
    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-bg/80 text-muted text-sm"
    >
      Cargando documento…
    </div>
  </div>
</template>
