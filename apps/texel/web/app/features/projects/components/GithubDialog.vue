<script setup lang="ts">
/**
 * Enlazar el proyecto con una carpeta de un repositorio, y sincronizar.
 *
 * Dos estados: sin enlace se elige repositorio, rama y carpeta del taller; con
 * enlace se ve qué hay por subir, por bajar y en conflicto, y se actúa. La
 * comparación que se enseña es la misma que ejecutan los botones, así que lo
 * que se lee aquí es lo que va a pasar.
 */
import { X, GitBranch, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Unlink } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { Change } from '~/shared/types/database'

const props = defineProps<{ projectId: string, projectName: string }>()
const emit = defineEmits<{ close: [] }>()

const {
  configured, installUrl, installations, link, report, busy, error,
  refresh, refreshStatus, loadInstallations, connect, disconnect, pull, push
} = useGithub(() => props.projectId)

/** Selección del formulario de enlace. */
const repoFullName = ref('')
const branch = ref('')
const workshop = ref('')
const message = ref('')

/** Conflictos que el usuario decide resolver, y hacia dónde. */
const resolution = ref<Record<string, 'mine' | 'theirs'>>({})

const repos = computed(() => installations.value.flatMap(i =>
  i.repos.map(repo => ({ ...repo, installationId: i.id }))))

const chosen = computed(() => repos.value.find(r => r.full_name === repoFullName.value) ?? null)

const conflicts = computed(() => report.value?.status.conflicts ?? [])
const mine = computed(() => conflicts.value.filter(c => resolution.value[c.path] === 'mine').map(c => c.path))
const theirs = computed(() => conflicts.value.filter(c => resolution.value[c.path] === 'theirs').map(c => c.path))
/** Sin resolver no se puede subir: subir con conflictos abiertos pisa el repo. */
const blocked = computed(() => conflicts.value.length > mine.value.length + theirs.value.length)

watch(chosen, (repo) => {
  if (repo && !branch.value) branch.value = repo.default_branch
  // El nombre del proyecto suele ser el del taller: se propone, no se impone.
  if (repo && !workshop.value) workshop.value = guessWorkshop(props.projectName)
})

/** «Taller 1 — …» → `latex/workshops/ws-01`, que es donde vive en el repo. */
function guessWorkshop(name: string): string {
  const number = /(\d+)/.exec(name)?.[1]
  return number ? `latex/workshops/ws-${number.padStart(2, '0')}` : 'latex/workshops/ws-01'
}

async function onConnect() {
  if (!chosen.value) return
  const ok = await connect({
    installationId: chosen.value.installationId,
    owner: chosen.value.owner,
    repo: chosen.value.name,
    branch: branch.value || chosen.value.default_branch,
    workshop: workshop.value.trim()
  })
  if (ok) toast.success(`Enlazado con ${chosen.value.full_name}`)
}

async function onPull() {
  const result = await pull(theirs.value)
  if (!result) return
  const total = result.applied.length + result.deleted.length
  toast.success(total ? `Traídos ${total} archivo(s)` : 'No había nada que traer')
  if (result.conflicts.length) toast.warning(`Quedan ${result.conflicts.length} en conflicto`)
}

async function onPush() {
  const result = await push(message.value, mine.value)
  if (!result) return
  toast.success(result.commit
    ? `Subido en ${result.commit.slice(0, 7)}`
    : 'No había nada que subir')
  message.value = ''
}

async function onDisconnect() {
  await disconnect()
  toast.success('Enlace deshecho')
}

/** Cómo se lee cada cambio en la lista. */
function label(change: Change): string {
  return {
    pull: 'llega del repo',
    'pull-delete': 'borrado en el repo',
    push: 'cambiado aquí',
    'push-delete': 'borrado aquí',
    conflict: 'cambiado en los dos sitios'
  }[change.action]
}

onMounted(refresh)
</script>

<template>
  <div class="fixed inset-0 bg-black/30 backdrop-blur-sm grid place-items-center p-5" @click.self="emit('close')">
    <div class="glass-menu rounded-[var(--radius-lg)] p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto">
      <header class="flex items-center mb-3">
        <h2 class="text-base font-semibold m-0">GitHub</h2>
        <span class="flex-1" />
        <button class="btn p-1" @click="emit('close')"><X :size="14" /></button>
      </header>

      <!-- Sin App configurada no hay nada que hacer desde aquí: es una variable
           de entorno del servidor, no algo que el usuario pueda arreglar. -->
      <p v-if="!configured" class="text-xs text-muted">
        Falta configurar la GitHub App en el servidor
        (<code>GITHUB_APP_ID</code>, <code>GITHUB_APP_PRIVATE_KEY</code>, <code>GITHUB_APP_SLUG</code>).
      </p>

      <template v-else-if="!link">
        <p class="text-xs text-muted mt-0 mb-3">
          Enlaza este proyecto con la carpeta de un taller en un repositorio. A partir de
          ahí, lo que escribas aquí se sube con un botón, y lo que escribas en el
          editor de tu ordenador se trae con otro.
        </p>

        <div class="flex gap-2 mb-3">
          <button class="btn flex-1" :disabled="!!busy" @click="loadInstallations">
            <RefreshCw :size="13" class="inline align-[-2px] mr-1" />
            Buscar repositorios
          </button>
          <a v-if="installUrl" :href="installUrl" target="_blank" rel="noopener" class="btn flex-1 text-center">
            Instalar la App
          </a>
        </div>

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

          <p class="text-[11px] text-muted mt-0 mb-3">
            La capa compartida (<code>tex/</code>: la clase, el preámbulo, la bibliografía) se
            sincroniza con <code>latex/tex/</code>, no con la carpeta del taller: es la misma
            para todos los talleres.
          </p>

          <button class="btn-primary w-full" :disabled="!chosen || !workshop.trim() || !!busy" @click="onConnect">
            Enlazar
          </button>
        </template>
      </template>

      <template v-else>
        <div class="flex items-center gap-2 text-sm mb-1">
          <GitBranch :size="14" class="text-muted shrink-0" />
          <span class="font-mono text-xs truncate">{{ link.owner }}/{{ link.repo }}</span>
          <span class="text-muted text-xs">· {{ link.branch }}</span>
          <span class="flex-1" />
          <button class="icon-btn w-7 h-7" title="Comparar de nuevo" :disabled="!!busy" @click="refreshStatus">
            <RefreshCw :size="13" />
          </button>
          <button class="icon-btn w-7 h-7 hover:text-[var(--danger)]" title="Deshacer el enlace"
            :disabled="!!busy" @click="onDisconnect">
            <Unlink :size="13" />
          </button>
        </div>

        <p class="text-xs text-muted mt-0 mb-3">{{ report?.summary ?? 'Comparando…' }}</p>

        <ul v-if="report && (report.status.ahead.length || report.status.behind.length)"
          class="list-none p-0 m-0 mb-3 grid gap-1">
          <li v-for="change in [...report.status.ahead, ...report.status.behind]" :key="change.path"
            class="flex items-center gap-2 text-xs">
            <component :is="change.action.startsWith('push') ? ArrowUpFromLine : ArrowDownToLine"
              :size="12" class="text-muted shrink-0" />
            <span class="font-mono truncate flex-1">{{ change.path }}</span>
            <span class="text-muted shrink-0">{{ label(change) }}</span>
          </li>
        </ul>

        <!-- Un conflicto no se resuelve solo: se elige lado, archivo a archivo.
             Mientras quede alguno sin elegir, subir queda bloqueado. -->
        <section v-if="conflicts.length" class="mb-3">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
            Cambiado en los dos sitios
          </h3>
          <ul class="list-none p-0 m-0 grid gap-1.5">
            <li v-for="change in conflicts" :key="change.path" class="flex items-center gap-2 text-xs">
              <span class="font-mono truncate flex-1">{{ change.path }}</span>
              <select v-model="resolution[change.path]" class="input py-0.5 text-xs w-auto shrink-0">
                <option :value="undefined">Sin decidir</option>
                <option value="mine">Gana lo de aquí</option>
                <option value="theirs">Gana lo del repo</option>
              </select>
            </li>
          </ul>
        </section>

        <input v-model="message" class="input w-full mb-2 text-xs"
          :placeholder="`texel: ${projectName}`">

        <div class="flex gap-2">
          <button class="btn flex-1" :disabled="!!busy" @click="onPull">
            <ArrowDownToLine :size="13" class="inline align-[-2px] mr-1" />
            Traer
          </button>
          <button class="btn-primary flex-1" :disabled="!!busy || blocked" @click="onPush">
            <ArrowUpFromLine :size="13" class="inline align-[-2px] mr-1" />
            Subir
          </button>
        </div>

        <p v-if="blocked" class="text-[11px] text-muted mt-2 mb-0">
          Decide qué lado gana en cada conflicto antes de subir.
        </p>

        <details v-if="report?.skipped.length" class="mt-3">
          <summary class="text-xs text-muted cursor-pointer">
            {{ report.skipped.length }} archivo(s) fuera de la sincronización
          </summary>
          <ul class="list-none p-0 mt-2 mb-0 grid gap-1">
            <li v-for="item in report.skipped" :key="item.path" class="text-[11px] text-muted">
              <span class="font-mono">{{ item.path }}</span> — {{ item.reason }}
            </li>
          </ul>
        </details>
      </template>

      <p v-if="busy" class="text-xs text-muted mt-3 mb-0">{{ busy }}</p>
      <p v-if="error" class="text-danger text-xs mt-3 mb-0">{{ error }}</p>
    </div>
  </div>
</template>
