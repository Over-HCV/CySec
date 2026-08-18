<script setup lang="ts">
import {
  MacButton, MacGlassPanel, MacProgress, MacSegment, MacSegmentedControl, MacTextField
} from '@macvue/core'
import {
  Plus, Trash2, FileText, FolderUp, User, SunMoon, Palette, Gauge, CopyPlus, Edit, ChevronDown
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import type { Project } from '~/shared/types/database'

const { projects, pending, refresh, remove, rename } = useProjects()
const { progress, importFolder, createFromTemplate, duplicateProject } = useProjectImport()
const user = useMe()
const supabase = useSupabaseClient()

/** El fondo se elige aquí y vale para toda la app; ver `useWallpaper`.
    La apariencia (claro/oscuro/sistema) es independiente del fondo. */
const { current: wallpaper, options: wallpapers } = useWallpaper()
const { current: appearance, options: appearances } = useAppearance()
const { current: detail, options: details } = useDetail()

/** Lo que se lee en el botón cuando el menú está cerrado. */
const appearanceLabel = computed(() => appearances.find(o => o.id === appearance.value)?.label ?? '')
const wallpaperLabel = computed(() => wallpapers.find(o => o.id === wallpaper.value)?.label ?? '')

const creating = ref(false)
const name = ref('')
const error = ref('')

/** Proyecto cuyo nombre se edita en la propia fila (Enter guarda, Esc cancela). */
const editingId = ref<string | null>(null)
const draftName = ref('')

/**
 * Tu nombre visible, el que ven los demás en la barra de presencia y en la lista
 * de miembros. Se edita en el sitio, igual que el de un proyecto: hasta ahora lo
 * fijaba el alta de la cuenta y no había forma de tocarlo.
 */
const { displayName, rename: renameMe } = useProfile()
const editingMe = ref(false)
const draftMe = ref('')

function startRenameMe() {
  draftMe.value = displayName.value
  editingMe.value = true
}

async function commitRenameMe() {
  if (!editingMe.value) return
  editingMe.value = false
  const message = await renameMe(draftMe.value)
  if (message) toast.error(message)
  else toast.success('Nombre actualizado')
}
// La referencia-función del input se reevalúa en cada parcheo; sin esto se
// re-seleccionaría el texto a cada tecleo.
let renameInput: HTMLInputElement | null = null

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

function startRename(project: Project) {
  editingId.value = project.id
  draftName.value = project.name
}

function focusRename(el: unknown) {
  const input = el as HTMLInputElement | null
  if (!input || input === renameInput) return
  renameInput = input
  input.focus()
  input.select()
}

async function commitRename(project: Project) {
  if (editingId.value !== project.id) return
  editingId.value = null
  const value = draftName.value.trim()
  // Vacío o sin cambios: lo mismo que cancelar (la BD exige 1–120 tras trim).
  if (!value || value === project.name) return
  try {
    await rename(project.id, value.slice(0, 120))
    toast.success(`Renombrado a «${value}»`)
  } catch (e) {
    error.value = (e as Error).message
    toast.error('No se pudo renombrar')
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
    // La capa del curso (clase, preámbulo, bibliografía) se añade sola cuando la
    // carpeta la necesita; se dice, que si no parece que se subió de más.
    const anadidos = plan.added.length ? ` (+${plan.added.length} de la capa del curso)` : ''
    toast.success(`Importados ${plan.texts.length + plan.binaries.length} archivos${omitidos}${anadidos}`)
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
  <div class="h-full flex flex-col overflow-hidden" @dragover.prevent="dragging = true"
    @dragleave.self="dragging = false" @drop.prevent="onDrop">
    <AppHeader>
      <template #leading>
        <img src="/assets/logo.png" alt="" width="18" height="18" class="shrink-0">
        <strong>Texel</strong>
        <span class="text-[var(--text-muted)] text-xs truncate">editor LaTeX colaborativo</span>
      </template>
      <template #trailing>
        <!-- Claro, oscuro o el del sistema. Sin esto, la app solo cambiaba
             con macOS y de noche el fondo «sky» quedaba apagado.

             `AppMenu` y no `MacPopUpButton`: el de macvue coloca su menú
             alineando la opción marcada sobre el botón, y con el botón a 40 px
             del borde superior de la ventana esa alineación no cabe — el menú
             se abría fuera de la pantalla. Ver `AppMenu.vue`. -->
        <SunMoon :size="18" class="text-white shrink-0" />
        <AppMenu align="end" aria-label="Apariencia de la interfaz">
          <template #trigger>
            {{ appearanceLabel }}
            <ChevronDown :size="11" class="opacity-70" />
          </template>
          <AppMenuItem
            v-for="option in appearances"
            :key="option.id"
            :checked="appearance === option.id"
            :hint="option.hint"
            @select="appearance = option.id"
          >
            {{ option.label }}
          </AppMenuItem>
        </AppMenu>

        <!-- El fondo no es un adorno: es lo que el cristal de los paneles
             refracta, así que cambiarlo cambia toda la interfaz. -->
        <Palette :size="18" class="text-white shrink-0" />
        <AppMenu align="end" aria-label="Fondo de la ventana">
          <template #trigger>
            {{ wallpaperLabel }}
            <ChevronDown :size="11" class="opacity-70" />
          </template>
          <AppMenuItem
            v-for="option in wallpapers"
            :key="option.id"
            :checked="wallpaper === option.id"
            :hint="option.hint"
            @select="wallpaper = option.id"
          >
            {{ option.label }}
          </AppMenuItem>
        </AppMenu>

        <!-- Detalle: en «alto» cada panel refracta el fondo con un filtro SVG,
             que en Chrome se pinta en el hilo principal y hace que el scroll del
             PDF y del editor vaya a tirones. «Bajo» vuelve al desenfoque normal.
             Se elige aquí, pero vale para toda la app; ver `useDetail`.

             Segmentado y no desplegable como los de al lado: son dos estados,
             y con dos estados un menú es un clic de más. -->
        <Gauge :size="18" class="text-white shrink-0" />
        <MacSegmentedControl v-model="detail" size="small" aria-label="Detalle de la interfaz">
          <MacSegment v-for="option in details" :key="option.id" :value="option.id">
            {{ option.label }}
          </MacSegment>
        </MacSegmentedControl>

        <!-- Tu nombre, no tu correo: es lo que ven los demás, así que es lo que
             tiene sentido poder corregir aquí. Un clic lo edita, como en la fila
             de un proyecto. El correo pasa al `title`. -->
        <User :size="18" class="text-white shrink-0" />
        <input
          v-if="editingMe"
          v-model="draftMe"
          :ref="focusRename"
          :maxlength="80"
          class="text-[12px] text-[var(--text)] bg-transparent outline-none px-0 py-0 border-0 border-b border-[var(--text-muted)] w-32"
          @keydown.enter.prevent="commitRenameMe"
          @keydown.escape="editingMe = false"
          @blur="commitRenameMe"
        >
        <button
          v-else
          class="text-[12px] text-[var(--text-muted)] bg-transparent border-0 p-0 cursor-pointer hover:text-[var(--text)] truncate max-w-40"
          :title="`${user?.email} — clic para cambiar tu nombre`"
          @click="startRenameMe"
        >
          {{ displayName }}
        </button>
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
      <input ref="picker" type="file" multiple webkitdirectory directory class="hidden" @change="onPick">

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
          <!-- Superficie barata, no `MacGlassPanel`, por lo mismo que explica
               `.block-card` en theme.css: un panel de cristal por fila son N
               lentes SVG —cada una con su filtro, sus dos mapas en data-URL, su
               `ResizeObserver` y un `MutationObserver` por ancestro— dentro de
               un scroller. La lista tiene que deslizarse, no refractar. -->
          <div class="project-row hover:brightness-110 transition-[filter]">
            <NuxtLink :to="`/p/${p.id}`" class="p-4 flex items-center gap-3 no-underline text-[var(--text)]">
              <FileText :size="16" class="text-muted" />
              <span class="flex-1 min-w-0">
                <!-- Mismo cuerpo tipográfico que el `span` que sustituye: la
                     fila no cambia de alto, solo gana un subrayado. -->
                <input v-if="editingId === p.id" v-model="draftName" :ref="focusRename" :maxlength="120"
                  class="block w-full font-medium text-inherit bg-transparent outline-none px-0 py-0 border-0 border-b border-[var(--text-muted)]"
                  @click.stop.prevent @keydown.enter.prevent="commitRename(p)"
                  @keydown.escape="editingId = null" @blur="commitRename(p)">
                <span v-else class="block font-medium">{{ p.name }}</span>
                <span class="block text-xs text-[var(--text-muted)]">
                  {{ p.engine }} · {{ p.root_file }} · actualizado {{ fmt(p.updated_at) }}
                </span>
              </span>

              <!-- Renombrar solo lo ve el dueño: el RLS de `projects` rechaza
                   el update de anyone else. -->
              <button v-if="p.owner_id === user?.id" class="icon-btn w-7 h-7" title="Renombrar proyecto"
                :disabled="!!progress" @click.prevent="startRename(p)">
                <Edit :size="14" />
              </button>

              <button class="icon-btn w-7 h-7" title="Duplicar: copia los archivos a un proyecto nuevo"
                :disabled="!!progress" @click.prevent="onDuplicate(p)">
                <CopyPlus :size="14" />
              </button>

              <button v-if="p.owner_id === user?.id" class="icon-btn w-7 h-7 hover:text-[var(--danger)]"
                title="Eliminar proyecto" @click.prevent="remove(p.id)">
                <Trash2 :size="14" />
              </button>
            </NuxtLink>
          </div>
        </li>
      </ul>
    </main>

    <!-- Sombra de destino mientras se arrastra: sin esto no se sabe si vale soltar. -->
    <div v-if="dragging"
      class="fixed inset-4 z-30 grid place-items-center rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] pointer-events-none">
      <span class="text-[15px] font-medium text-[var(--text)]">
        Suelta la carpeta para crear el proyecto
      </span>
    </div>
  </div>
</template>
