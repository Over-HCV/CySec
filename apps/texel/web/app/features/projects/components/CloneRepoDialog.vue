<script setup lang="ts">
/**
 * «Cargar repositorio»: crea un proyecto nuevo trayéndolo de una carpeta de un
 * repositorio de GitHub.
 *
 * No hay proyecto todavía, así que no se puede usar `useGithub` (que cuelga de
 * uno): se habla directo con `/api/github/config` e `/api/github/installations`,
 * que son de la persona y no de un proyecto, y el clon lo hace
 * `importFromRepo` (crear → enlazar → traer).
 */
import { X, Github, GitBranch, RefreshCw, ExternalLink } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { GithubIdentity, GithubInstallation } from '~/shared/composables/useGithub'

const emit = defineEmits<{ close: [] }>()

const { progress, importFromRepo } = useProjectImport()

const SETUP_DOCS = 'https://github.com/Over-HCV/CySec/blob/main/apps/texel/docs/github-app.md'

const configured = ref(false)
const canSignIn = ref(false)
const identity = ref<GithubIdentity | null>(null)
const installUrl = ref<string | null>(null)
const installations = ref<GithubInstallation[]>([])
const busy = ref<string | null>(null)
const error = ref('')

const repoFullName = ref('')
const branch = ref('')
const workshop = ref('')
const name = ref('')

const repos = computed(() => installations.value.flatMap(i =>
  i.repos.map(repo => ({ ...repo, installationId: i.id }))))
const chosen = computed(() => repos.value.find(r => r.full_name === repoFullName.value) ?? null)

watch(chosen, (repo) => {
  if (repo && !branch.value) branch.value = repo.default_branch
})

async function run<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  busy.value = label
  error.value = ''
  try {
    return await fn()
  } catch (e) {
    const cause = e as { statusMessage?: string, data?: { statusMessage?: string }, message?: string }
    error.value = cause.data?.statusMessage ?? cause.statusMessage ?? cause.message ?? 'error desconocido'
    return null
  } finally {
    busy.value = null
  }
}

async function refresh() {
  const config = await $fetch<{
    configured: boolean, canSignIn: boolean, identity: GithubIdentity | null, installUrl: string | null
  }>('/api/github/config')
  configured.value = config.configured
  canSignIn.value = config.canSignIn
  identity.value = config.identity
  installUrl.value = config.installUrl
  if (config.configured && config.identity) await loadInstallations()
}

async function loadInstallations() {
  await run('Buscando repositorios…', async () => {
    installations.value = await $fetch<GithubInstallation[]>('/api/github/installations')
  })
}

/** Identidad sin proyecto: el baile vuelve a la lista (`/?github=ok`). */
function signIn() {
  window.location.href = '/api/github/oauth/start'
}

async function onLoad() {
  if (!chosen.value || !workshop.value.trim()) return
  const id = await run('Cargando…', () => importFromRepo({
    name: name.value.trim() || chosen.value!.name,
    installationId: chosen.value!.installationId,
    owner: chosen.value!.owner,
    repo: chosen.value!.name,
    branch: branch.value || chosen.value!.default_branch,
    workshop: workshop.value.trim()
  }))
  if (id) {
    toast.success('Repositorio cargado')
    await navigateTo(`/p/${id}`)
  }
}

onMounted(refresh)
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm grid place-items-center p-5" @click.self="emit('close')">
    <div class="glass-menu rounded-[var(--radius-lg)] p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto">
      <header class="flex items-center mb-3">
        <h2 class="text-base font-semibold m-0">Cargar repositorio</h2>
        <span class="flex-1" />
        <button class="btn p-1" @click="emit('close')"><X :size="14" /></button>
      </header>

      <template v-if="!configured">
        <p class="text-xs text-muted mt-0 mb-2">
          GitHub no está conectado en este Texel todavía.
        </p>
        <a :href="SETUP_DOCS" target="_blank" rel="noopener" class="btn w-full text-center">
          Cómo conectarse <ExternalLink :size="12" class="inline align-[-2px] ml-1" />
        </a>
      </template>

      <template v-else>
        <p class="text-xs text-muted mt-0 mb-3">
          Crea un proyecto nuevo trayendo la carpeta de un taller desde un repositorio.
          Queda enlazado, así que luego podrás subir y traer cambios con un botón.
        </p>

        <template v-if="canSignIn && !identity">
          <button class="btn-primary w-full" :disabled="!!busy" @click="signIn">
            <Github :size="14" class="inline align-[-3px] mr-1" />
            Conectar con GitHub
          </button>
          <p class="text-[11px] text-muted mt-2 mb-0">
            Se usa solo para saber a qué repositorios llegas. Texel no guarda tu contraseña
            ni tu token.
          </p>
        </template>

        <template v-else>
          <div v-if="identity" class="flex items-center gap-2 text-xs text-muted mb-3">
            <img v-if="identity.avatar_url" :src="identity.avatar_url" alt="" class="w-5 h-5 rounded-full">
            <span class="flex-1">Conectado como <strong>@{{ identity.login }}</strong></span>
            <button class="icon-btn w-7 h-7" title="Volver a mirar tus repositorios"
              :disabled="!!busy" @click="loadInstallations">
              <RefreshCw :size="13" />
            </button>
          </div>

          <p v-if="!repos.length && !busy" class="text-xs text-muted mt-0 mb-2">
            No hay ningún repositorio a tu alcance todavía: instala la App en el que quieras
            cargar y vuelves aquí solo.
          </p>

          <a v-if="installUrl" :href="installUrl"
            :class="repos.length ? 'btn w-full text-center mb-3' : 'btn-primary w-full text-center mb-3'">
            Instalar la App en un repositorio
          </a>
        </template>

        <template v-if="repos.length">
          <label class="block text-xs text-muted mb-1">Repositorio</label>
          <select v-model="repoFullName" class="input w-full mb-2">
            <option value="">Elige uno…</option>
            <option v-for="repo in repos" :key="repo.full_name" :value="repo.full_name">
              {{ repo.full_name }}
            </option>
          </select>

          <div class="flex gap-2 mb-2">
            <span class="flex-1">
              <label class="block text-xs text-muted mb-1">Rama</label>
              <input v-model="branch" class="input w-full" :placeholder="chosen?.default_branch ?? 'main'">
            </span>
            <span class="flex-[2]">
              <label class="block text-xs text-muted mb-1">Carpeta del taller</label>
              <input v-model="workshop" class="input w-full font-mono text-xs" placeholder="latex/workshops/ws-01">
            </span>
          </div>

          <label class="block text-xs text-muted mb-1">Nombre del proyecto (opcional)</label>
          <input v-model="name" class="input w-full mb-3" :placeholder="chosen?.name ?? 'Taller'">

          <button class="btn-primary w-full" :disabled="!chosen || !workshop.trim() || !!busy || !!progress" @click="onLoad">
            <GitBranch :size="13" class="inline align-[-2px] mr-1" />
            Cargar
          </button>
        </template>
      </template>

      <p v-if="busy || progress" class="text-xs text-muted mt-3 mb-0">{{ progress?.label ?? busy }}</p>
      <p v-if="error" class="text-danger text-xs mt-3 mb-0">{{ error }}</p>
    </div>
  </div>
</template>
