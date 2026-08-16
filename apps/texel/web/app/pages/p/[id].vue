<script setup lang="ts">
import { MacButton, MacSegment, MacSegmentedControl, MacSpinner } from '@macvue/core'
import {
  Play, Users, ArrowLeft, PanelLeft, PanelRight, WrapText, CornerDownRight
} from 'lucide-vue-next'
import type { Project, ProjectFile, Diagnostic } from '~/shared/types/database'
import type { ProviderUser, SupabaseYjsProvider } from '~/features/editor/lib/supabase-yjs-provider'
import { docKindOf } from '~/features/visual/lib/types'

const route = useRoute()
const projectId = route.params.id as string
const supabase = useSupabaseClient()
const user = useMe()

const project = ref<Project | null>(null)
const profile = ref<{ display_name: string, color: string } | null>(null)
const activeFile = ref<ProjectFile | null>(null)
const peers = ref<ProviderUser[]>([])
const cursorLine = ref(1)
const showShare = ref(false)

const { files, refresh: refreshFiles, create, remove } = useProjectFiles(projectId)
const { canWrite, isOwner, refresh: refreshMembers } = useProjectMembers(projectId)
const { compiling, last, pdfUrl, compile, forward, inverse, loadLast } = useCompiler(projectId)
const { state: layout, setSidebarWidth, setEditorRatio, setLogHeight } = usePanes()

const editor = ref<{
  goToLine: (n: number) => void
  remeasure: () => void
  getText: () => string
} | null>(null)
const viewer = ref<{ showHighlight: (a: { page: number, x: number, y: number, w: number, h: number }) => void } | null>(null)
const body = ref<HTMLElement>()

// ── Pestañas Código | Visual ─────────────────────────────────────────────────
// El editor de código nunca se desmonta: es dueño del documento Yjs y de la
// conexión, y tirarla en cada cambio de pestaña sería absurdo. Se oculta con
// `v-show` y comparte su proveedor con la vista visual, que trabaja sobre el
// mismo `Y.Text`.
// `shallowRef` a propósito: hacer reactivo en profundidad un `Y.Doc` sería
// envolver en proxies las estructuras internas del CRDT.
const provider = shallowRef<SupabaseYjsProvider | null>(null)

/** Solo `.tex` y `.bib` tienen representación por bloques. */
const visualKind = computed(() => activeFile.value ? docKindOf(activeFile.value.path) : null)

const tab = computed<'code' | 'visual'>({
  get: () => (visualKind.value ? layout.value.editorTab : 'code'),
  set: async (value) => {
    layout.value.editorTab = value
    if (value === 'code') {
      await nextTick()
      editor.value?.remeasure()
    }
  }
})

// Otro archivo es otro documento: el proveedor anterior ya no vale.
watch(() => activeFile.value?.id, () => { provider.value = null })

const me = computed<ProviderUser>(() => ({
  id: user.value?.id ?? 'anon',
  name: profile.value?.display_name ?? user.value?.email ?? 'Anónimo',
  color: profile.value?.color ?? '#1F4E79'
}))

onMounted(async () => {
  const { data: p } = await supabase.from('projects').select('*').eq('id', projectId).single()
  project.value = p as Project

  // El perfil solo se puede pedir cuando ya hay usuario; si la sesión tarda,
  // se reintenta en cuanto aparezca en vez de reventar con un `!`.
  watch(user, async (value) => {
    if (!value) return
    const { data } = await supabase
      .from('profiles').select('display_name, color').eq('id', value.id).single()
    profile.value = data as never
  }, { immediate: true })

  await Promise.all([refreshFiles(), refreshMembers(), loadLast()])
  activeFile.value = files.value.find(f => f.path === project.value?.root_file) ?? files.value[0] ?? null

  // Otro colaborador compiló: refrescamos el PDF sin recargar la página.
  supabase
    .channel(`compilations:${projectId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'compilations', filter: `project_id=eq.${projectId}` },
      () => { void loadLast() }
    )
    .subscribe()
})

// ── Redimensionado ───────────────────────────────────────────────────────────
// Cada arrastre parte del valor que había al empezar; el divisor envía deltas.
let dragStart = { sidebar: 0, ratio: 0, log: 0 }

function beginDrag() {
  dragStart = {
    sidebar: layout.value.sidebarWidth,
    ratio: layout.value.editorRatio,
    log: layout.value.logHeight
  }
}

function dragSidebar({ x }: { x: number }) {
  setSidebarWidth(dragStart.sidebar + x)
}

function dragMiddle({ x }: { x: number }) {
  const total = body.value?.clientWidth ?? 1
  const usable = total - (layout.value.sidebarOpen ? layout.value.sidebarWidth : 0)
  setEditorRatio(dragStart.ratio + x / Math.max(usable, 1))
}

function dragLog({ y }: { y: number }) {
  setLogHeight(dragStart.log - y)
}

// ── Acciones ─────────────────────────────────────────────────────────────────
async function runCompile() {
  if (!activeFile.value || !editor.value) return
  await supabase
    .from('files')
    .update({ content: editor.value.getText(), updated_by: user.value?.id })
    .eq('id', activeFile.value.id)
  await compile()
}

async function onCreateFile(path: string) {
  const file = await create(path, `% ${path}\n`)
  await refreshFiles()
  activeFile.value = file
}

async function onRemoveFile(file: ProjectFile) {
  await remove(file)
  await refreshFiles()
  if (activeFile.value?.id === file.id) activeFile.value = files.value[0] ?? null
}

async function onSetRoot(file: ProjectFile) {
  await supabase.from('projects').update({ root_file: file.path }).eq('id', projectId)
  if (project.value) project.value.root_file = file.path
}

/** Editor → PDF. */
async function jumpToPdf() {
  if (!activeFile.value) return
  if (!layout.value.pdfOpen) layout.value.pdfOpen = true
  const area = await forward(activeFile.value.path, cursorLine.value)
  if (area) viewer.value?.showHighlight(area)
}

/** PDF → editor. */
async function onPdfClick({ page, x, y }: { page: number, x: number, y: number }) {
  const src = await inverse(page, x, y)
  if (!src) return
  await focusFile(src.file, src.line)
}

/** Clic en un problema del log → cursor en esa línea. */
async function onJumpDiagnostic(d: Diagnostic) {
  await focusFile(d.file, d.line ?? undefined)
}

async function focusFile(path: string, line?: number) {
  const target = files.value.find(f => f.path === path || f.path.endsWith(path))
  if (target && target.id !== activeFile.value?.id) {
    activeFile.value = target
    await nextTick()
  }
  if (line) editor.value?.goToLine(line)
}
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Barra de título -->
    <!-- La cabecera nunca debe empujar el ancho de la ventana: el bloque de la
         izquierda se encoge y trunca, el de la derecha se queda fijo. -->
    <header class="chrome flex items-center gap-2 px-3 h-[var(--header-h)] shrink-0 border-b border-[var(--border)] overflow-hidden">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <NuxtLink to="/" class="icon-btn shrink-0" title="Volver a proyectos">
          <ArrowLeft :size="15" />
        </NuxtLink>

        <strong class="text-[13px] truncate">{{ project?.name ?? '…' }}</strong>
        <span class="chip shrink-0 hidden lg:inline-flex">{{ project?.engine }}</span>
        <span class="chip shrink-0 font-mono hidden xl:inline-flex">{{ project?.root_file }}</span>
        <span v-if="!canWrite" class="chip shrink-0">solo lectura</span>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <PresenceBar :me="me" :peers="peers" />

        <MacButton size="small" :disabled="!isOwner" @click="showShare = true">
          <Users :size="13" class="mr-1 inline align-[-2px]" /> Compartir
        </MacButton>

        <MacButton size="small" variant="prominent" :disabled="compiling || !canWrite" @click="runCompile">
          <MacSpinner v-if="compiling" size="small" class="mr-1 inline align-[-2px]" />
          <Play v-else :size="13" class="mr-1 inline align-[-2px]" />
          {{ compiling ? 'Compilando' : 'Compilar' }}
        </MacButton>
      </div>
    </header>

    <!-- Cuerpo: barra lateral | editor | PDF.
         Los paneles flotan separados sobre el fondo: sin ese hueco el cristal
         no tendría nada que refractar y volvería a verse plano. -->
    <div ref="body" class="flex-1 flex min-h-0 overflow-hidden gap-3 px-3 pb-3 pt-1">
      <FileTree
        v-show="layout.sidebarOpen"
        :style="{ width: `${layout.sidebarWidth}px`, flex: `0 0 ${layout.sidebarWidth}px` }"
        :files="files"
        :active-id="activeFile?.id ?? null"
        :root-file="project?.root_file ?? 'main.tex'"
        :can-write="canWrite"
        @select="activeFile = $event"
        @create="onCreateFile"
        @remove="onRemoveFile"
        @set-root="onSetRoot"
        @collapse="layout.sidebarOpen = false"
      />

      <!-- Sin riel: la barra se recupera con el botón de la barra del editor,
           que es el mismo que la oculta. -->
      <PaneDivider
        v-show="layout.sidebarOpen"
        @start="beginDrag"
        @move="dragSidebar"
        @reset="setSidebarWidth(230)"
      />

      <!-- Editor -->
      <section
        class="glass-work rounded-[var(--radius-lg)] overflow-hidden flex flex-col pane"
        :style="{
          flex: layout.pdfOpen ? `${layout.editorRatio} 1 0%` : '1 1 0%'
        }"
      >
        <div class="flex items-center gap-1.5 px-2 h-[var(--bar-h)] shrink-0 border-b border-[var(--macvue-material-glass-regular-rim)]">
          <button
            class="icon-btn"
            :title="layout.sidebarOpen ? 'Ocultar archivos' : 'Mostrar archivos'"
            @click="layout.sidebarOpen = !layout.sidebarOpen"
          >
            <PanelLeft :size="14" :class="layout.sidebarOpen ? 'text-[var(--accent)]' : ''" />
          </button>

          <MacSegmentedControl
            v-if="visualKind"
            :model-value="tab"
            size="small"
            @update:model-value="tab = $event as 'code' | 'visual'"
          >
            <MacSegment value="code">Código</MacSegment>
            <MacSegment value="visual">Visual</MacSegment>
          </MacSegmentedControl>

          <span class="font-mono text-[11.5px] text-[var(--text-muted)] truncate">
            {{ activeFile?.path ?? 'sin archivo' }}
          </span>

          <span class="flex-1" />

          <button
            class="icon-btn"
            :title="layout.wrap ? 'Desactivar ajuste de línea' : 'Activar ajuste de línea'"
            @click="layout.wrap = !layout.wrap"
          >
            <WrapText :size="14" :class="layout.wrap ? 'text-[var(--accent)]' : ''" />
          </button>

          <button class="icon-btn" title="Ir al PDF (SyncTeX)" :disabled="!last?.synctex_path" @click="jumpToPdf">
            <CornerDownRight :size="14" />
          </button>

          <button
            class="icon-btn"
            :title="layout.pdfOpen ? 'Ocultar PDF' : 'Mostrar PDF'"
            @click="layout.pdfOpen = !layout.pdfOpen"
          >
            <PanelRight :size="14" :class="layout.pdfOpen ? 'text-[var(--accent)]' : ''" />
          </button>
        </div>

        <div class="flex-1 pane relative">
          <TexEditor
            v-if="activeFile"
            v-show="tab === 'code'"
            ref="editor"
            :key="activeFile.id"
            :file-id="activeFile.id"
            :can-write="canWrite"
            :user="me"
            :wrap="layout.wrap"
            :diagnostics="last?.diagnostics"
            @peers="peers = $event"
            @cursor-line="cursorLine = $event"
            @ready="provider = $event"
          />

          <VisualEditor
            v-if="activeFile && visualKind && tab === 'visual' && provider"
            :key="`visual-${activeFile.id}`"
            :provider="provider"
            :path="activeFile.path"
            :can-write="canWrite"
            class="absolute inset-0"
          />

          <div
            v-else-if="tab === 'visual'"
            class="absolute inset-0 grid place-items-center text-[var(--text-muted)] text-xs"
          >
            Cargando documento…
          </div>
        </div>
      </section>

      <PaneDivider
        v-show="layout.pdfOpen"
        @start="beginDrag"
        @move="dragMiddle"
        @reset="setEditorRatio(0.5)"
      />

      <!-- PDF + log -->
      <section
        v-show="layout.pdfOpen"
        class="glass rounded-[var(--radius-lg)] overflow-hidden flex flex-col pane"
        :style="{ flex: `${1 - layout.editorRatio} 1 0%` }"
      >
        <div class="flex-1 pane">
          <PdfViewer ref="viewer" :src="pdfUrl" @pdf-click="onPdfClick" />
        </div>

        <PaneDivider
          v-show="layout.logOpen"
          direction="horizontal"
          @start="beginDrag"
          @move="dragLog"
          @reset="setLogHeight(180)"
        />

        <LogPanel
          :compilation="last"
          :open="layout.logOpen"
          :style="{ height: layout.logOpen ? `${layout.logHeight}px` : 'var(--bar-h)' }"
          class="shrink-0"
          @jump="onJumpDiagnostic"
          @toggle="layout.logOpen = !layout.logOpen"
        />
      </section>
    </div>

    <ShareDialog v-if="showShare" :project-id="projectId" @close="showShare = false" />
  </div>
</template>
