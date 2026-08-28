<script setup lang="ts">
import { MacGlassPanel, MacSearchField } from '@macvue/core'
import { ChevronRight, FileText, FilePlus, FolderPlus, Trash2, Image, FileCode, Folder, FolderOpen } from 'lucide-vue-next'
import type { ProjectFile } from '~/shared/types/database'

const props = defineProps<{
  files: ProjectFile[]
  activeId: string | null
  rootFile: string
  canWrite: boolean
}>()

const emit = defineEmits<{
  select: [ProjectFile]
  create: [string]
  remove: [ProjectFile]
  setRoot: [ProjectFile]
}>()

const query = ref('')
/** 'file' pide la ruta de un archivo; 'folder', el nombre de una carpeta. */
const creating = ref<'file' | 'folder' | null>(null)
const newPath = ref('')
const collapsed = ref<Set<string>>(new Set())

// No hay tabla de carpetas: una carpeta existe porque hay archivos con esa
// ruta. Al crear una vacía se guarda aquí para que se vea en el árbol, y
// desaparece sola en cuanto se recarga si nadie puso nada dentro.
const pendingFolders = ref<string[]>([])

interface Folder { name: string, files: ProjectFile[] }

/** Agrupa por carpeta: '' es la raíz y va siempre primero. */
const folders = computed<Folder[]>(() => {
  const needle = query.value.trim().toLowerCase()
  const groups = new Map<string, ProjectFile[]>()

  for (const folder of pendingFolders.value) {
    if (needle && !folder.toLowerCase().includes(needle)) continue
    groups.set(folder, [])
  }

  for (const file of props.files) {
    if (needle && !file.path.toLowerCase().includes(needle)) continue
    const dir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : ''
    if (!groups.has(dir)) groups.set(dir, [])
    groups.get(dir)!.push(file)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b, 'es')))
    .map(([name, files]) => ({
      name,
      files: files.sort((a, b) => a.path.localeCompare(b.path, 'es'))
    }))
})

const leaf = (path: string) => path.slice(path.lastIndexOf('/') + 1)

function toggleFolder(name: string) {
  const next = new Set(collapsed.value)
  next.has(name) ? next.delete(name) : next.add(name)
  collapsed.value = next
}

function iconFor(file: ProjectFile) {
  if (file.kind === 'binary') return Image
  return /\.(cls|sty|bib)$/.test(file.path) ? FileCode : FileText
}

function confirmCreate() {
  const value = newPath.value.trim().replace(/^\/+|\/+$/g, '')
  const mode = creating.value
  newPath.value = ''
  creating.value = null
  if (!value) return

  if (mode === 'folder') {
    if (!pendingFolders.value.includes(value)) pendingFolders.value.push(value)
    // Encadena: la carpeta vacía no se guarda en ningún sitio, así que lo
    // siguiente es pedir el primer archivo que vivirá dentro.
    startCreate('file', `${value}/`)
    return
  }

  emit('create', value)
}

function startCreate(mode: 'file' | 'folder', prefill = '') {
  creating.value = mode
  newPath.value = prefill
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('[data-new-path]')
    input?.focus()
    input?.setSelectionRange(prefill.length, prefill.length)
  })
}

// Buscar abre todas las carpetas: esconder resultados sería absurdo.
watch(query, (value) => { if (value) collapsed.value = new Set() })
</script>

<template>
  <MacGlassPanel material="regular" role="complementary" class="h-full flex flex-col pane">
    <header class="flex items-center gap-1 px-2 h-[var(--bar-h)] shrink-0">
      <span class="flex-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] pl-1">
        Archivos
      </span>
      <button v-if="canWrite" class="icon-btn" title="Nuevo archivo" @click="startCreate('file')">
        <FilePlus :size="14" />
      </button>
      <button v-if="canWrite" class="icon-btn" title="Nueva carpeta" @click="startCreate('folder')">
        <FolderPlus :size="14" />
      </button>
    </header>

    <div class="px-2 pb-2 shrink-0">
      <MacSearchField v-model="query" size="small" placeholder="Filtrar" />
    </div>

    <div class="flex-1 overflow-y-auto overflow-x-hidden pb-2 pane">
      <div v-if="creating" class="px-2 pb-1">
        <input v-model="newPath" data-new-path class="input text-xs py-1"
          :placeholder="creating === 'folder' ? 'sections' : 'sections/02-nueva.tex'" @keyup.enter="confirmCreate"
          @keyup.escape="creating = null; newPath = ''" @blur="confirmCreate">
      </div>

      <template v-for="folder in folders" :key="folder.name || 'root'">

        <button v-if="folder.name"
          class="w-full flex items-center gap-1 px-2 py-1 border-none bg-transparent text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
          @click="toggleFolder(folder.name)">

          <ChevronRight :size="12" class="transition-transform duration-150"
            :class="collapsed.has(folder.name) ? '' : 'rotate-90'" />

          <component :is="collapsed.has(folder.name) ? Folder : FolderOpen" :size="12" class="shrink-0" />

          <span class="truncate">{{ folder.name }}</span>
        </button>

        <ul v-show="!collapsed.has(folder.name)" class="list-none m-0 p-0">
          <li v-for="file in folder.files" :key="file.id">
            <div class="group flex items-center gap-1.5 mx-1.5 px-2 py-[3px] rounded-md cursor-default"
              :class="file.id === activeId ? 'bg-[var(--bg-selected)]' : 'hover:bg-[var(--bg-hover)]'"
              :style="folder.name ? 'padding-left: 22px' : ''" :title="file.path" @click="emit('select', file)">
              <component :is="iconFor(file)" :size="13" class="shrink-0 text-[var(--text-muted)]" />
              <span class="flex-1 truncate text-[12px]">{{ leaf(file.path) }}</span>

              <span v-if="file.path === rootFile" class="chip h-[15px] px-1 text-[9px]"
                title="Archivo raíz de la compilación">raíz</span>

              <template v-else-if="canWrite">
                <button class="icon-btn w-5 h-5 hidden group-hover:grid" title="Marcar como archivo raíz"
                  @click.stop="emit('setRoot', file)">
                  <FileCode :size="11" />
                </button>
                <button class="icon-btn w-5 h-5 hidden group-hover:grid hover:text-[var(--danger)]"
                  title="Eliminar archivo" @click.stop="emit('remove', file)">
                  <Trash2 :size="11" />
                </button>
              </template>
            </div>
          </li>

          <li v-if="folder.name && !folder.files.length"
            class="px-2 py-0.5 pl-[30px] text-[11px] text-[var(--text-muted)] italic">
            carpeta vacía
          </li>
        </ul>
      </template>

      <p v-if="!folders.length" class="px-3 py-2 text-[11px] text-[var(--text-faint)]">
        {{ query ? 'Ningún archivo coincide.' : 'Sin archivos.' }}
      </p>
    </div>
  </MacGlassPanel>
</template>
