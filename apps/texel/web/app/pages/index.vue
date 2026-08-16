<script setup lang="ts">
import {
  MacButton, MacGlassPanel, MacPopUpButton, MacPopUpButtonItem, MacProgress, MacTextField
} from '@macvue/core'
import { Plus, Trash2, FileText, FolderUp, Copy } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import type { Project } from '~/shared/types/database'

const { projects, pending, refresh, remove } = useProjects()
const { progress, importFolder, createFromTemplate, duplicateProject } = useProjectImport()
const user = useMe()
const supabase = useSupabaseClient()

/** El fondo se elige aquí y vale para toda la app; ver `useWallpaper`. */
const { current: wallpaper, options: wallpapers } = useWallpaper()

const creating = ref(false)
const name = ref('')
const error = ref('')

/**
 * Un proyecto nuevo nace de la plantilla del repo: clase, preámbulo,
 * bibliografía y un taller listo. Antes nacía con un `main.tex` de ejemplo que
 * no encontraba su clase, así que no compilaba hasta subir media carpeta.
 */
async function onCreate() {
  if (!name.value.trim()) return
  try {
    const id = await createFromTemplate(name.value.trim())
    await navigateTo(`/p/${id}`)
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function onDuplicate(project: Project) {
  error.value = ''
  try {
    const id = await duplicateProject(project)
    toast.success(`Copiado: ${project.name}`)
    await navigateTo(`/p/${id}`)
  } catch (e) {
    error.value = (e as Error).message
    toast.error('No se pudo duplicar')
  }
}

// ── Cargar una carpeta del ordenador ─────────────────────────────────────────
// Dos caminos hacia lo mismo: el selector nativo (`webkitdirectory`, que rellena
// `webkitRelativePath`) y soltar la carpeta encima, que da entradas del sistema
// de archivos y hay que recorrer a mano.
const picker = ref<HTMLInputElement>()
const dragging = ref(false)

async function run(entries: { relativePath: string, file: File }[]) {
  error.value = ''
  try {
    const { id, plan } = await importFolder(entries)
    const omitidos = plan.skipped.length ? `, ${plan.skipped.length} omitidos` : ''
    toast.success(`Importados ${plan.texts.length + plan.binaries.length} archivos${omitidos}`)
    await navigateTo(`/p/${id}`)
  } catch (e) {
    error.value = (e as Error).message
    toast.error('No se pudo importar la carpeta')
  }
}

async function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  await run(files.map(file => ({ relativePath: file.webkitRelativePath || file.name, file })))
}

async function onDrop(event: DragEvent) {
  dragging.value = false
  const items = event.dataTransfer?.items
  if (!items?.length) return
  await run(await readDropped(items))
}

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/auth')
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es', {
  day: 'numeric', month: 'short', year: 'numeric'
})

onMounted(refresh)
</script>

<template>
  <div
    class="h-full flex flex-col overflow-hidden"
    @dragover.prevent="dragging = true"
    @dragleave.self="dragging = false"
    @drop.prevent="onDrop"
  >
    <AppHeader>
      <template #leading>
        <FileText :size="18" class="text-white shrink-0" />
        <strong>Texel</strong>
        <span class="text-[var(--text-muted)] text-xs truncate">editor LaTeX colaborativo</span>
      </template>
      <template #trailing>
        <!-- El fondo no es un adorno: es lo que el cristal de los paneles
             refracta, así que cambiarlo cambia toda la interfaz. -->
        <MacPopUpButton
          v-model="wallpaper"
          size="small"
          aria-label="Fondo de la ventana"
        >
          <MacPopUpButtonItem
            v-for="option in wallpapers"
            :key="option.id"
            :value="option.id"
            :text-value="option.label"
          >
            {{ option.label }}
          </MacPopUpButtonItem>
        </MacPopUpButton>

        <span class="text-[12px] text-[var(--text-muted)]">{{ user?.email }}</span>
        <MacButton size="small" @click="signOut">Salir</MacButton>
      </template>
    </AppHeader>

    <main class="flex-1 overflow-y-auto pane max-w-4xl mx-auto px-5 py-8 w-full">
      <div class="flex items-center gap-2 mb-5">
        <h1 class="text-xl font-semibold m-0 text-[var(--text)]">Proyectos</h1>
        <span class="flex-1" />
        <MacButton size="regular" :disabled="!!progress" @click="picker?.click()">
          <FolderUp :size="15" class="inline align-[-3px] mr-1" /> Cargar proyecto
        </MacButton>
        <MacButton size="regular" variant="prominent" @click="creating = true">
          <Plus :size="15" class="inline align-[-3px] mr-1" /> Nuevo proyecto
        </MacButton>
      </div>

      <!-- `webkitdirectory` no está en los tipos de Vue, de ahí el atributo suelto. -->
      <input
        ref="picker"
        type="file"
        multiple
        webkitdirectory
        directory
        class="hidden"
        @change="onPick"
      >

      <MacGlassPanel v-if="creating" material="regular" class="p-4 mb-4">
        <form @submit.prevent="onCreate">
          <div class="flex gap-2">
            <span class="flex-1">
              <MacTextField v-model="name" placeholder="Nombre del proyecto" />
            </span>
            <MacButton variant="prominent" type="submit" :disabled="!!progress">Crear</MacButton>
            <MacButton type="button" @click="creating = false; name = ''">Cancelar</MacButton>
          </div>
          <p class="m-0 mt-2 text-[11.5px] text-[var(--text-faint)]">
            Se crea con la plantilla del curso: clase <code>cysec</code>, preámbulo,
            bibliografía y un taller en <code>workshops/ws-01/</code>. Compila tal cual.
          </p>
        </form>
      </MacGlassPanel>

      <MacGlassPanel v-if="progress" material="regular" class="p-4 mb-4">
        <p class="text-[12.5px] text-[var(--text-muted)] m-0 mb-2">
          Importando {{ progress.done }} / {{ progress.total }} — {{ progress.label }}
        </p>
        <MacProgress :value="progress.done" :max="progress.total" label="Importando carpeta" />
      </MacGlassPanel>

      <p v-if="error" class="text-danger text-sm">{{ error }}</p>
      <p v-if="pending" class="text-[var(--text-muted)] text-sm">Cargando…</p>

      <p v-else-if="!projects.length" class="text-[var(--text-muted)] text-sm">
        Todavía no hay proyectos. Crea el primero, o arrastra aquí una carpeta con tu LaTeX.
      </p>

      <ul class="list-none p-0 m-0 grid gap-2">
        <li v-for="p in projects" :key="p.id">
          <!-- El cristal va en el panel y el enlace lo rellena: `MacGlassPanel`
               renderiza un `div`, así que no puede ser el enlace en sí. -->
          <MacGlassPanel material="regular" class="hover:brightness-110 transition-all">
            <NuxtLink
              :to="`/p/${p.id}`"
              class="p-4 flex items-center gap-3 no-underline text-[var(--text)]"
            >
              <FileText :size="16" class="text-muted" />
              <span class="flex-1">
                <span class="block font-medium">{{ p.name }}</span>
                <span class="block text-xs text-[var(--text-muted)]">
                  {{ p.engine }} · {{ p.root_file }} · actualizado {{ fmt(p.updated_at) }}
                </span>
              </span>
              <button
                class="icon-btn w-7 h-7"
                title="Duplicar: copia los archivos a un proyecto nuevo"
                :disabled="!!progress"
                @click.prevent="onDuplicate(p)"
              >
                <Copy :size="14" />
              </button>
              <button
                v-if="p.owner_id === user?.id"
                class="icon-btn w-7 h-7 hover:text-[var(--danger)]"
                title="Eliminar proyecto"
                @click.prevent="remove(p.id)"
              >
                <Trash2 :size="14" />
              </button>
            </NuxtLink>
          </MacGlassPanel>
        </li>
      </ul>
    </main>

    <!-- Sombra de destino mientras se arrastra: sin esto no se sabe si vale soltar. -->
    <div
      v-if="dragging"
      class="fixed inset-4 z-30 grid place-items-center rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] pointer-events-none"
    >
      <span class="text-[15px] font-medium text-[var(--text)]">
        Suelta la carpeta para crear el proyecto
      </span>
    </div>
  </div>
</template>
