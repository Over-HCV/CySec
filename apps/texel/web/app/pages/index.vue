<script setup lang="ts">
import { MacButton } from '@macvue/core'
import { Plus, Trash2, FileText } from 'lucide-vue-next'

const { projects, pending, refresh, create, remove } = useProjects()
const user = useMe()
const supabase = useSupabaseClient()

const creating = ref(false)
const name = ref('')
const error = ref('')

async function onCreate() {
  if (!name.value.trim()) return
  try {
    const id = await create(name.value.trim())
    await navigateTo(`/p/${id}`)
  } catch (e) {
    error.value = (e as Error).message
  }
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
  <div class="min-h-full">
    <header class="chrome flex items-center gap-3 px-5 h-14 border-b border-[var(--macvue-material-glass-regular-rim)]">
      <FileText :size="18" class="text-accent" />
      <strong>Texel</strong>
      <span class="text-[var(--text-muted)] text-xs">editor LaTeX colaborativo</span>
      <span class="flex-1" />
      <span class="text-[12px] text-[var(--text-muted)]">{{ user?.email }}</span>
      <MacButton size="small" @click="signOut">Salir</MacButton>
    </header>

    <main class="max-w-4xl mx-auto px-5 py-8">
      <div class="flex items-center mb-5">
        <h1 class="text-xl font-semibold m-0 text-[var(--text)]">Proyectos</h1>
        <span class="flex-1" />
        <MacButton size="regular" variant="prominent" @click="creating = true">
          <Plus :size="15" class="inline align-[-3px] mr-1" /> Nuevo proyecto
        </MacButton>
      </div>

      <form v-if="creating" class="glass rounded-[var(--radius-lg)] p-4 mb-4 flex gap-2" @submit.prevent="onCreate">
        <input v-model="name" class="input flex-1" placeholder="Nombre del proyecto" autofocus>
        <button class="btn-primary" type="submit">Crear</button>
        <button class="btn" type="button" @click="creating = false; name = ''">Cancelar</button>
      </form>

      <p v-if="error" class="text-danger text-sm">{{ error }}</p>
      <p v-if="pending" class="text-[var(--text-muted)] text-sm">Cargando…</p>

      <p v-else-if="!projects.length" class="text-[var(--text-muted)] text-sm">
        Todavía no hay proyectos. Crea el primero.
      </p>

      <ul class="list-none p-0 m-0 grid gap-2">
        <li v-for="p in projects" :key="p.id">
          <NuxtLink
            :to="`/p/${p.id}`"
            class="glass rounded-[var(--radius-lg)] p-4 flex items-center gap-3 no-underline text-[var(--text)] hover:brightness-110 transition-all"
          >
            <FileText :size="16" class="text-muted" />
            <span class="flex-1">
              <span class="block font-medium">{{ p.name }}</span>
              <span class="block text-xs text-[var(--text-muted)]">
                {{ p.engine }} · {{ p.root_file }} · actualizado {{ fmt(p.updated_at) }}
              </span>
            </span>
            <button
              v-if="p.owner_id === user?.id"
              class="icon-btn w-7 h-7 hover:text-[var(--danger)]"
              title="Eliminar proyecto"
              @click.prevent="remove(p.id)"
            >
              <Trash2 :size="14" />
            </button>
          </NuxtLink>
        </li>
      </ul>
    </main>
  </div>
</template>
