<script setup lang="ts">
import { Play, Users, ArrowLeft, Loader } from 'lucide-vue-next'
import type { Project, ProjectFile, Diagnostic } from '~/shared/types/database'
import type { ProviderUser } from '~/features/editor/lib/supabase-yjs-provider'

const route = useRoute()
const projectId = route.params.id as string
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const project = ref<Project | null>(null)
const profile = ref<{ display_name: string, color: string } | null>(null)
const activeFile = ref<ProjectFile | null>(null)
const peers = ref<ProviderUser[]>([])
const cursorLine = ref(1)
const showShare = ref(false)

const { files, refresh: refreshFiles, create, remove } = useProjectFiles(projectId)
const { canWrite, isOwner, refresh: refreshMembers } = useProjectMembers(projectId)
const { compiling, last, pdfUrl, compile, forward, inverse, loadLast } = useCompiler(projectId)

const editor = ref<{ goToLine: (n: number) => void, getText: () => string } | null>(null)
const viewer = ref<{ showHighlight: (a: { page: number, x: number, y: number, w: number, h: number }) => void } | null>(null)

const me = computed<ProviderUser>(() => ({
  id: user.value?.id ?? 'anon',
  name: profile.value?.display_name ?? user.value?.email ?? 'Anónimo',
  color: profile.value?.color ?? '#1F4E79'
}))

onMounted(async () => {
  const [{ data: p }, { data: prof }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('profiles').select('display_name, color').eq('id', user.value!.id).single()
  ])
  project.value = p as Project
  profile.value = prof as never

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

/** Vuelca el texto vivo del editor a files.content y lanza la compilación. */
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
  const area = await forward(activeFile.value.path, cursorLine.value)
  if (area) viewer.value?.showHighlight(area)
}

/** PDF → editor. */
async function onPdfClick({ page, x, y }: { page: number, x: number, y: number }) {
  const src = await inverse(page, x, y)
  if (!src) return
  const target = files.value.find(f => f.path === src.file || f.path.endsWith(src.file))
  if (target && target.id !== activeFile.value?.id) {
    activeFile.value = target
    await nextTick()
  }
  editor.value?.goToLine(src.line)
}

/** Clic en un problema del log → cursor en esa línea. */
async function onJumpDiagnostic(d: Diagnostic) {
  const target = files.value.find(f => f.path === d.file || f.path.endsWith(d.file))
  if (target && target.id !== activeFile.value?.id) {
    activeFile.value = target
    await nextTick()
  }
  if (d.line) editor.value?.goToLine(d.line)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <header class="flex items-center gap-3 px-3 h-12 border-b border-border shrink-0">
      <NuxtLink to="/" class="text-muted hover:text-text" title="Volver a proyectos">
        <ArrowLeft :size="16" />
      </NuxtLink>
      <strong class="text-sm">{{ project?.name ?? '…' }}</strong>
      <span class="text-xs text-muted">{{ project?.engine }} · {{ project?.root_file }}</span>

      <span class="flex-1" />

      <PresenceBar :me="me" :peers="peers" />

      <button
        class="btn text-xs flex items-center gap-1.5"
        :disabled="!isOwner"
        @click="showShare = true"
      >
        <Users :size="14" /> Compartir
      </button>

      <button
        class="btn-primary text-xs flex items-center gap-1.5"
        :disabled="compiling || !canWrite"
        @click="runCompile"
      >
        <component :is="compiling ? Loader : Play" :size="14" :class="compiling ? 'animate-spin' : ''" />
        {{ compiling ? 'Compilando…' : 'Compilar' }}
      </button>
    </header>

    <div class="flex-1 grid grid-cols-[220px_1fr_1fr] min-h-0">
      <FileTree
        :files="files"
        :active-id="activeFile?.id ?? null"
        :root-file="project?.root_file ?? 'main.tex'"
        :can-write="canWrite"
        @select="activeFile = $event"
        @create="onCreateFile"
        @remove="onRemoveFile"
        @set-root="onSetRoot"
      />

      <section class="min-w-0 flex flex-col border-r border-border">
        <div class="flex items-center gap-2 px-3 h-10 border-b border-border text-xs text-muted shrink-0">
          <span class="font-mono">{{ activeFile?.path ?? 'sin archivo' }}</span>
          <span v-if="!canWrite" class="px-1.5 rounded bg-sunken">solo lectura</span>
          <span class="flex-1" />
          <button class="btn py-0.5 px-2" :disabled="!last?.synctex_path" @click="jumpToPdf">
            Ir al PDF
          </button>
        </div>

        <div class="flex-1 min-h-0">
          <TexEditor
            v-if="activeFile"
            ref="editor"
            :key="activeFile.id"
            :file-id="activeFile.id"
            :can-write="canWrite"
            :user="me"
            :diagnostics="last?.diagnostics"
            @peers="peers = $event"
            @cursor-line="cursorLine = $event"
          />
        </div>
      </section>

      <section class="min-w-0 grid grid-rows-[1fr_200px]">
        <PdfViewer ref="viewer" :src="pdfUrl" @pdf-click="onPdfClick" />
        <LogPanel :compilation="last" @jump="onJumpDiagnostic" />
      </section>
    </div>

    <ShareDialog v-if="showShare" :project-id="projectId" @close="showShare = false" />
  </div>
</template>
