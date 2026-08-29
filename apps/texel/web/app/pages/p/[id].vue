<script setup lang="ts">
import {
  MacButton, MacGlassPanel, MacSegment, MacSegmentedControl, MacSeparator, MacSpinner
} from '@macvue/core'
import {
  Play, Users, ArrowLeft, PanelLeft, PanelRight, WrapText, CornerDownRight, ChevronDown, Github
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { formatTex, minimalPatch } from '~/features/editor/lib/format-tex'
import { SEED_ORIGIN } from '~/features/editor/lib/seed'
import type { Project, ProjectFile, Diagnostic } from '~/shared/types/database'
import type { ProviderUser, SupabaseYjsProvider } from '~/features/editor/lib/supabase-yjs-provider'
import type { CompileMode } from '~/shared/composables/usePanes'
import { docKindOf } from '~/features/visual/lib/types'

const route = useRoute()
const projectId = route.params.id as string
const supabase = useSupabaseClient()
const user = useMe()

const project = ref<Project | null>(null)
const { profile } = useProfile()
const activeFile = ref<ProjectFile | null>(null)
const peers = ref<ProviderUser[]>([])
const cursorLine = ref(1)
const showShare = ref(false)
const showGithub = ref(false)

// Vuelta de GitHub (iniciar sesión o instalar la App): se reabre el diálogo
// donde se estaba, y se limpia la marca para que recargar no lo abra otra vez.
if (route.query.github === 'ok') {
  showGithub.value = true
  void navigateTo({ query: {} }, { replace: true })
}

const { files, refresh: refreshFiles, create, remove } = useProjectFiles(projectId)
const { addCourseLayer } = useProjectImport()
const { canWrite, isOwner, refresh: refreshMembers } = useProjectMembers(projectId)
const { compiling, last, pdfUrl, compile, downloadPdf, forward, inverse, loadLast } = useCompiler(projectId)
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

// Otro archivo es otro documento: el proveedor anterior ya no vale, y su lista
// de conectados tampoco — el canal es por archivo, así que quien estuviera en el
// anterior no tiene por qué estar en este.
watch(() => activeFile.value?.id, () => { provider.value = null; peers.value = [] })

// `||` y no `??`: el respaldo tiene que saltar también con la cadena vacía, que
// es justo lo que guarda `handle_new_user` si la cuenta se creó con un
// `full_name` en blanco. Con `??` salía un nombre invisible en vez del correo.
const me = computed<ProviderUser>(() => ({
  id: user.value?.id ?? 'anon',
  name: profile.value?.display_name?.trim() || user.value?.email || 'Anónimo',
  color: profile.value?.color || '#1F4E79'
}))

onMounted(async () => {
  // Un proyecto se abre siempre igual: por bloques y sin el árbol de archivos
  // delante. Lo que se toque después vale para esta sesión, no para la próxima
  // vez que se entre (ver `PER_SESSION` en `usePanes`).
  layout.value.editorTab = 'visual'
  layout.value.sidebarOpen = false

  const { data: p } = await supabase.from('projects').select('*').eq('id', projectId).single()
  project.value = p as Project

  // El perfil lo carga `useProfile`, que ya espera a que haya sesión.

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
// El ancho del cuerpo se mide una vez al empezar y no en cada movimiento:
// `clientWidth` fuerza un cálculo de layout, y el arrastre no lo cambia.
let dragStart = { sidebar: 0, ratio: 0, log: 0, width: 1 }

function beginDrag() {
  dragStart = {
    sidebar: layout.value.sidebarWidth,
    ratio: layout.value.editorRatio,
    log: layout.value.logHeight,
    width: body.value?.clientWidth ?? 1
  }
}

function dragSidebar({ x }: { x: number }) {
  setSidebarWidth(dragStart.sidebar + x)
}

function dragMiddle({ x }: { x: number }) {
  const usable = dragStart.width - (layout.value.sidebarOpen ? layout.value.sidebarWidth : 0)
  setEditorRatio(dragStart.ratio + x / Math.max(usable, 1))
}

function dragLog({ y }: { y: number }) {
  setLogHeight(dragStart.log - y)
}

// ── Guardar, formatear y compilar ────────────────────────────────────────────
/**
 * Vuelca el documento vivo a `files.content`, que es lo que lee el compilador.
 *
 * La condición del proveedor no es una precaución de más: mientras conecta, el
 * texto del editor está vacío, y guardar en ese momento dejaba el archivo en
 * blanco en la base de datos.
 */
async function saveActive(): Promise<boolean> {
  if (!activeFile.value || !provider.value || !canWrite.value) return false
  const { error } = await supabase
    .from('files')
    .update({ content: provider.value.text, updated_by: user.value?.id })
    .eq('id', activeFile.value.id)
  return !error
}

/**
 * ⌘S: ordena el archivo y lo guarda.
 *
 * Se formatea sobre el documento compartido y **por parches**: se escribe solo
 * el tramo que cambia, así que quien esté escribiendo en otro párrafo no pierde
 * lo que lleva ni el sitio del cursor. Ver `format-tex.ts`.
 */
const saving = ref(false)

async function saveAndFormat() {
  if (!provider.value || !canWrite.value || saving.value) return
  saving.value = true
  try {
    if (visualKind.value === 'tex') {
      const ytext = provider.value.doc.getText('content')
      const before = ytext.toString()
      const patch = minimalPatch(before, formatTex(before))
      if (patch) {
        ytext.doc!.transact(() => {
          if (patch.remove > 0) ytext.delete(patch.from, patch.remove)
          if (patch.insert) ytext.insert(patch.from, patch.insert)
        }, 'format')
      }
    }
    const ok = await saveActive()
    if (ok) toast.success('Guardado y formateado')
    else toast.error('No se pudo guardar')
  } finally {
    saving.value = false
  }
}

async function runCompile(mode: CompileMode = layout.value.compileMode) {
  if (!activeFile.value || !provider.value) return
  await saveActive()
  await compile(mode)
}

// ── Compilación automática ───────────────────────────────────────────────────
// El «auto-compile» de Overleaf: al dejar de escribir se guarda y se compila.
//
// Solo la dispara quien escribe (`origin` local): si también la disparara quien
// recibe, un tecleo lanzaría una compilación por cada persona conectada. Los
// demás ven el PDF nuevo igual, por el canal `compilations:*`.
const compileTitle = computed(() =>
  layout.value.autoCompile
    ? 'Compilar (⌘⏎) · automática activada'
    : 'Compilar (⌘⏎)')

const AUTO_MS = 2500
let autoTimer: ReturnType<typeof setTimeout> | null = null
let autoPending = false
let unwatchDoc: (() => void) | null = null

function scheduleAutoCompile() {
  if (!layout.value.autoCompile || !canWrite.value) return
  if (autoTimer) clearTimeout(autoTimer)
  autoTimer = setTimeout(() => { void fireAutoCompile() }, AUTO_MS)
}

async function fireAutoCompile() {
  autoTimer = null
  if (!layout.value.autoCompile || !canWrite.value || !provider.value) return
  // Con una compilación en curso no se encolan N: se apunta y se lanza una sola
  // al terminar, ya con el texto de ese momento.
  if (compiling.value) { autoPending = true; return }
  await runCompile()
  if (autoPending) { autoPending = false; scheduleAutoCompile() }
}

// La carga inicial y lo que llega de otros vienen con origen `'remote'`, y la
// siembra del documento con `SEED_ORIGIN`: ninguna de las dos es una edición.
watch(provider, (value) => {
  unwatchDoc?.()
  unwatchDoc = null
  if (!value) return

  const onUpdate = (_update: Uint8Array, origin: unknown) => {
    if (origin === 'remote' || origin === SEED_ORIGIN) return
    scheduleAutoCompile()
  }
  value.doc.on('update', onUpdate)
  unwatchDoc = () => value.doc.off('update', onUpdate)
})

onBeforeUnmount(() => {
  unwatchDoc?.()
  if (autoTimer) clearTimeout(autoTimer)
})

/**
 * Completa el proyecto con la capa del curso que le falte y vuelve a compilar.
 *
 * Es para lo que se importó antes de que la importación la inyectara sola: una
 * carpeta de taller no trae `cysec.cls` —vive en `latex/tex/`— y el proyecto
 * muere en «File `cysec.cls' not found». El panel de log ofrece el botón
 * justo cuando el log dice eso.
 */
const repairing = ref(false)

async function repairCourseLayer() {
  if (repairing.value || !canWrite.value) return
  repairing.value = true
  try {
    const added = await addCourseLayer(
      projectId,
      files.value.map(f => ({ path: f.path, content: f.content ?? undefined }))
    )
    if (!added.length) {
      toast.info('El proyecto ya tiene la capa del curso')
      return
    }
    await refreshFiles()
    toast.success(`Añadidos ${added.length} archivos de la capa del curso`)
    await runCompile()
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    repairing.value = false
  }
}

/** ⌘S guarda y formatea; ⌘⏎ compila. Sin pasar por el menú del navegador. */
function onKeydown(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey)) return
  if (event.key === 's') {
    event.preventDefault()
    void saveAndFormat()
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (!compiling.value) void runCompile()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

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

/**
 * Plegar el editor para que el PDF ocupe la ventana entera.
 *
 * El panel se queda —y con él `TexEditor`, que es el dueño del documento Yjs y
 * de la conexión—; lo que cambia es su `flex`. Desmontarlo para ganar sitio
 * costaría tirar la sesión de edición y volver a sembrar el documento al
 * regresar. Al volver hay que remedir: CodeMirror calcula mal cuando lo han
 * maquetado a 34 px de ancho.
 */
async function toggleEditor() {
  layout.value.editorOpen = !layout.value.editorOpen
  if (!layout.value.editorOpen) return
  await nextTick()
  editor.value?.remeasure()
}

/**
 * SyncTeX en los dos sentidos.
 *
 * Los dos hablan con el servicio de compilación, y los dos se quedaban en
 * silencio si no contestaba: la promesa se rechazaba y no pasaba nada. En local
 * eso es lo normal —`NUXT_PUBLIC_COMPILER_URL` apunta a `localhost:8080` y ahí
 * no suele haber nadie— y parecía que el clic estuviera roto en vez de que
 * faltara el compilador.
 */
function synctexFailed(e: unknown) {
  toast.error(`SyncTeX: ${(e as Error).message}`)
}

/** Editor → PDF. */
async function jumpToPdf() {
  if (!activeFile.value) return
  try {
    const area = await forward(activeFile.value.path, cursorLine.value)
    if (area) viewer.value?.showHighlight(area)
  } catch (e) {
    synctexFailed(e)
  }
}

/** PDF → editor. */
async function onPdfClick({ page, x, y }: { page: number, x: number, y: number }) {
  try {
    const src = await inverse(page, x, y)
    if (!src) return
    await focusFile(src.file, src.line)
  } catch (e) {
    synctexFailed(e)
  }
}

/**
 * Guardar el PDF en disco. El nombre sale del proyecto; se limpian los
 * caracteres que Windows no admite en un nombre de archivo, que si no llegan
 * tal cual a la cabecera `Content-Disposition`.
 */
async function onDownloadPdf() {
  const base = (project.value?.name ?? 'documento').replace(/[\\/:*?"<>|]+/g, '-').trim()
  try {
    await downloadPdf(`${base}.pdf`)
  } catch (e) {
    toast.error(`No se pudo descargar el PDF: ${(e as Error).message}`)
  }
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
    <!-- Barra de título flotante (AppHeader): el contenido cambia según el
         contexto, pero el material es el mismo en toda la aplicación. -->
    <AppHeader>
      <template #leading>
        <NuxtLink to="/" class="icon-btn shrink-0" title="Volver a proyectos">
          <ArrowLeft :size="15" />
        </NuxtLink>

        <strong class="text-[13px] truncate">{{ project?.name ?? '…' }}</strong>
        <span class="chip shrink-0 hidden lg:inline-flex">{{ project?.engine }}</span>
        <span class="chip shrink-0 font-mono hidden xl:inline-flex">{{ project?.root_file }}</span>
        <span v-if="!canWrite" class="chip shrink-0">solo lectura</span>
      </template>

      <template #trailing>
        <PresenceBar :me="me" :peers="peers" />

        <MacButton size="small" :disabled="!isOwner" @click="showShare = true">
          <Users :size="13" class="mr-1 inline align-[-2px]" /> Compartir
        </MacButton>

        <!-- Sincronizar es cosa del dueño, igual que compartir: cambia a qué
             repositorio escribe el proyecto entero. -->
        <MacButton size="small" :disabled="!isOwner" @click="showGithub = true">
          <Github :size="13" class="mr-1 inline align-[-2px]" /> GitHub
        </MacButton>

        <!-- Botón partido: el lado izquierdo compila ya, el derecho abre las
             opciones (automática, modo). Sin proveedor no hay documento que
             guardar: compilar ahora subiría un archivo vacío. Ver `saveActive`. -->
        <div class="flex items-center gap-px">
          <MacButton
            size="small"
            variant="prominent"
            :disabled="compiling || !canWrite || !provider"
            :title="compileTitle"
            @click="runCompile()"
          >
            <MacSpinner v-if="compiling" size="small" class="mr-1 inline align-[-2px]" />
            <Play v-else :size="13" class="mr-1 inline align-[-2px]" />
            {{ compiling ? 'Compilando' : 'Compilar' }}
            <span v-if="layout.compileMode === 'fast'" class="opacity-70"> · rápido</span>
          </MacButton>

          <!-- `AppMenu` y no `MacPullDownButton`: el menú de macvue se abría
               dentro del cristal de la cabecera, que es `overflow: hidden`, y
               no había forma de verlo entero. Ver `AppMenu.vue`. Sin contenido
               en el disparador queda solo el chevron, que es justo el lado
               derecho de un botón partido. -->
          <AppMenu
            align="end"
            trigger-class="menu-trigger menu-trigger--icon"
            :disabled="!canWrite"
            title="Opciones de compilación"
            aria-label="Opciones de compilación"
          >
            <template #trigger>
              <ChevronDown :size="12" />
            </template>

            <AppMenuItem
              :checked="layout.autoCompile"
              @select="layout.autoCompile = !layout.autoCompile"
            >
              Compilación automática
            </AppMenuItem>

            <MacSeparator />

            <AppMenuItem :checked="layout.compileMode === 'normal'" @select="layout.compileMode = 'normal'">
              Normal
            </AppMenuItem>
            <AppMenuItem :checked="layout.compileMode === 'fast'" @select="layout.compileMode = 'fast'">
              Rápido (borrador)
            </AppMenuItem>

            <MacSeparator />

            <!-- Acción de una vez, no un modo: no toca `layout.compileMode`.
                 Es la salida cuando la bibliografía o los índices se quedan con
                 lo de la compilación anterior. -->
            <AppMenuItem
              :disabled="compiling"
              hint="Rehace la bibliografía y los índices ignorando la caché"
              @select="runCompile('full')"
            >
              Recompilar desde cero
            </AppMenuItem>
          </AppMenu>
        </div>
      </template>
    </AppHeader>

    <!-- Cuerpo: barra lateral | editor | PDF.
         Los paneles flotan separados sobre el fondo: sin ese hueco el cristal
         no tendría nada que refractar y volvería a verse plano. -->
    <div ref="body" class="flex-1 flex min-h-0 overflow-hidden gap-3 p-3">
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

      <!-- Editor. Plegado no desaparece: se queda en una tira de 34 px con el
           botón para devolverlo, y el PDF se lleva el resto de la ventana. -->
      <MacGlassPanel
        material="clear"
        class="flex flex-col pane"
        :style="{
          flex: layout.editorOpen ? `${layout.editorRatio} 1 0%` : '0 0 34px'
        }"
      >
        <div
          v-show="!layout.editorOpen"
          class="flex justify-center pt-2 shrink-0"
        >
          <button class="icon-btn" title="Restaurar editor" @click="toggleEditor">
            <PanelLeft :size="14" />
          </button>
        </div>

        <div
          v-show="layout.editorOpen"
          class="flex items-center gap-1.5 px-2 h-[var(--bar-h)] shrink-0 border-b border-[var(--macvue-material-glass-regular-rim)]"
        >
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

          <!-- Formato del modo visual: fija y siempre a la vista, porque quien
               no sabe LaTeX no va a adivinar que `\textbf{…}` existe. -->
          <FormatBar v-if="tab === 'visual' && canWrite" />

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

          <!-- Expande el PDF, no esconde nada: el editor se pliega a una tira
               con su botón para volver. Esconder el PDF para agrandar el editor
               —lo que hacía antes— no es lo que se quiere de este botón. -->
          <button class="icon-btn" title="Expandir PDF" @click="toggleEditor">
            <PanelRight :size="14" />
          </button>
        </div>

        <div v-show="layout.editorOpen" class="flex-1 pane relative">
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
            :project-id="projectId"
            class="absolute inset-0"
          />

          <div
            v-else-if="tab === 'visual'"
            class="absolute inset-0 grid place-items-center text-[var(--text-muted)] text-xs"
          >
            Cargando documento…
          </div>
        </div>
      </MacGlassPanel>

      <PaneDivider
        v-show="layout.editorOpen"
        @start="beginDrag"
        @move="dragMiddle"
        @reset="setEditorRatio(0.5)"
      />

      <!-- PDF + log -->
      <MacGlassPanel
        material="regular"
        class="flex flex-col pane"
        :style="{ flex: layout.editorOpen ? `${1 - layout.editorRatio} 1 0%` : '1 1 0%' }"
      >
        <div class="flex-1 pane">
          <PdfViewer ref="viewer" :src="pdfUrl" @pdf-click="onPdfClick" @download="onDownloadPdf" />
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
          :can-repair="canWrite && !repairing"
          :style="{ height: layout.logOpen ? `${layout.logHeight}px` : 'var(--bar-h)' }"
          class="shrink-0"
          @jump="onJumpDiagnostic"
          @toggle="layout.logOpen = !layout.logOpen"
          @repair="repairCourseLayer"
        />
      </MacGlassPanel>
    </div>

    <ShareDialog v-if="showShare" :project-id="projectId" @close="showShare = false" />

    <GithubDialog
      v-if="showGithub"
      :project-id="projectId"
      :project-name="project?.name ?? ''"
      @close="showGithub = false"
    />
  </div>
</template>
