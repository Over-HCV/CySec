<script setup lang="ts">
import { Plus, Trash2, FileText } from 'lucide-vue-next'

const { projects, pending, refresh, create, remove } = useProjects()
const user = useSupabaseUser()
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
    <header class="flex items-center gap-3 px-5 h-14 border-b border-border">
      <FileText :size="18" class="text-accent" />
      <strong>Texel</strong>
      <span class="text-muted text-xs">editor LaTeX colaborativo</span>
      <span class="flex-1" />
      <span class="text-xs text-muted">{{ user?.email }}</span>
      <button class="btn text-xs" @click="signOut">Salir</button>
    </header>

    <main class="max-w-4xl mx-auto px-5 py-8">
      <div class="flex items-center mb-5">
        <h1 class="text-xl font-semibold m-0">Proyectos</h1>
        <span class="flex-1" />
        <button class="btn-primary flex items-center gap-1.5" @click="creating = true">
          <Plus :size="15" /> Nuevo proyecto
        </button>
      </div>

      <form v-if="creating" class="card mb-4 flex gap-2" @submit.prevent="onCreate">
        <input v-model="name" class="input flex-1" placeholder="Nombre del proyecto" autofocus>
        <button class="btn-primary" type="submit">Crear</button>
        <button class="btn" type="button" @click="creating = false; name = ''">Cancelar</button>
      </form>

      <p v-if="error" class="text-danger text-sm">{{ error }}</p>
      <p v-if="pending" class="text-muted text-sm">Cargando…</p>

      <p v-else-if="!projects.length" class="text-muted text-sm">
        Todavía no hay proyectos. Crea el primero.
      </p>

      <ul class="list-none p-0 m-0 grid gap-2">
        <li v-for="p in projects" :key="p.id">
          <NuxtLink
            :to="`/p/${p.id}`"
            class="card flex items-center gap-3 no-underline text-text hover:border-accent transition-colors"
          >
            <FileText :size="16" class="text-muted" />
            <span class="flex-1">
              <span class="block font-medium">{{ p.name }}</span>
              <span class="block text-xs text-muted">
                {{ p.engine }} · {{ p.root_file }} · actualizado {{ fmt(p.updated_at) }}
              </span>
            </span>
            <button
              v-if="p.owner_id === user?.id"
              class="btn p-1.5"
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
