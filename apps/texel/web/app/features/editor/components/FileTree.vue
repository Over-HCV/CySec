<script setup lang="ts">
import { FileText, FilePlus, Trash2, Image } from 'lucide-vue-next'
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

const creating = ref(false)
const newPath = ref('')

// Ordena por carpeta y luego por nombre, para que sections/ quede agrupado.
const sorted = computed(() =>
  [...props.files].sort((a, b) => a.path.localeCompare(b.path, 'es'))
)

function confirmCreate() {
  const path = newPath.value.trim()
  if (path) emit('create', path)
  newPath.value = ''
  creating.value = false
}
</script>

<template>
  <aside class="h-full flex flex-col bg-sunken border-r border-border">
    <header class="flex items-center justify-between px-3 h-10 border-b border-border">
      <span class="text-xs font-semibold uppercase tracking-wide text-muted">Archivos</span>
      <button
        v-if="canWrite"
        class="p-1 rounded hover:bg-raised"
        title="Nuevo archivo"
        @click="creating = true"
      >
        <FilePlus :size="15" />
      </button>
    </header>

    <div class="flex-1 overflow-y-auto py-1">
      <div v-if="creating" class="px-2 py-1">
        <input
          v-model="newPath"
          v-focus
          class="input w-full text-xs"
          placeholder="sections/02-nueva.tex"
          @keyup.enter="confirmCreate"
          @keyup.escape="creating = false; newPath = ''"
          @blur="confirmCreate"
        >
      </div>

      <button
        v-for="file in sorted"
        :key="file.id"
        class="group w-full flex items-center gap-2 px-3 py-1 text-left text-xs border-none bg-transparent text-text hover:bg-raised"
        :class="file.id === activeId ? 'bg-raised font-medium' : ''"
        @click="emit('select', file)"
      >
        <component
          :is="file.kind === 'binary' ? Image : FileText"
          :size="13"
          class="shrink-0 text-muted"
        />
        <span class="truncate flex-1">{{ file.path }}</span>
        <span
          v-if="file.path === rootFile"
          class="text-[10px] px-1 rounded bg-accentSoft text-accent"
          title="Archivo raíz de la compilación"
        >raíz</span>
        <span
          v-else-if="canWrite"
          class="opacity-0 group-hover:opacity-100 flex items-center gap-1"
        >
          <span
            class="text-[10px] text-muted hover:text-accent"
            title="Marcar como archivo raíz"
            @click.stop="emit('setRoot', file)"
          >raíz</span>
          <Trash2
            :size="12"
            class="text-muted hover:text-danger"
            @click.stop="emit('remove', file)"
          />
        </span>
      </button>
    </div>
  </aside>
</template>
