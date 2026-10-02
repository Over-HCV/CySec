<script setup lang="ts">
/**
 * Enlazar el proyecto con una carpeta de un repositorio, y sincronizar con
 * lógica de control de versiones: se trae lo entrante, se preparan (stage) los
 * cambios de aquí archivo a archivo, y se sube solo lo preparado en un commit.
 *
 * Dos estados: sin enlace se elige repositorio, rama y carpeta del taller; con
 * enlace se ve qué hay por traer, qué cambió aquí, y qué está preparado. La
 * comparación que se enseña es la misma que ejecutan los botones, así que lo
 * que se lee aquí es lo que va a pasar.
 */
import {
  X, GitBranch, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Unlink, Github, ExternalLink,
  Plus, Minus, RotateCcw
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { Change } from '~/shared/types/database'

const props = defineProps<{ projectId: string, projectName: string }>()
const emit = defineEmits<{ close: [] }>()

const {
  configured, canSignIn, identity, installUrl, installations, link, report, busy, error, staged,
  refresh, refreshStatus, loadInstallations, signIn, connect, disconnect, pull,
  stage, unstage, stageAll, unstageAll, commit, restore
} = useGithub(() => props.projectId)

/** Dónde se explica cómo crear la App, para quien despliega Texel. */
const SETUP_DOCS = 'https://github.com/Over-HCV/CySec/blob/main/apps/texel/docs/github-app.md'

/** Selección del formulario de enlace. */
const repoFullName = ref('')
const branch = ref('')
const workshop = ref('')
const message = ref('')

const repos = computed(() => installations.value.flatMap(i =>
  i.repos.map(repo => ({ ...repo, installationId: i.id }))))

const chosen = computed(() => repos.value.find(r => r.full_name === repoFullName.value) ?? null)

// ── Los tres grupos de la vista enlazada ─────────────────────────────────────
// Entrantes: lo que cambió en el repo (se trae con «Traer»).
// Cambios: lo que cambió aquí y no está preparado (ahead + conflictos).
// Preparados: lo que entrará en el próximo commit.
const incoming = computed(() => report.value?.status.behind ?? [])
const outgoing = computed(() => [
  ...(report.value?.status.ahead ?? []),
  ...(report.value?.status.conflicts ?? [])
])
const changes = computed(() => outgoing.value.filter(c => !staged.value.has(c.path)))
const stagedChanges = computed(() => outgoing.value.filter(c => staged.value.has(c.path)))
/** Conflictos preparados: su commit resuelve a favor de aquí (pasa como `force`). */
const stagedConflicts = computed(() =>
  stagedChanges.value.filter(c => c.action === 'conflict').map(c => c.path))
/** Todas las rutas en conflicto (para que «Traer» las resuelva a favor del repo). */
const conflictPaths = computed(() => (report.value?.status.conflicts ?? []).map(c => c.path))
/** Hay algo que bajar: entrantes, o conflictos que el repo puede resolver. */
const canPull = computed(() => incoming.value.length > 0 || conflictPaths.value.length > 0)

/** Letra tipo git para cada cambio: A(ñadido) · M(odificado) · D(borrado) · !(conflicto). */
function statusLetter(change: Change): string {
  if (change.action === 'conflict') return '!'
  if (change.action.endsWith('delete')) return 'D'
  if (change.base === null && change.remote === null) return 'A'
  return 'M'
}

/** Explicación larga al pasar el ratón. */
function label(change: Change): string {
  return {
    pull: 'llega del repo',
    'pull-delete': 'borrado en el repo',
    push: 'cambiado aquí',
    'push-delete': 'borrado aquí',
    conflict: 'cambiado en los dos sitios'
  }[change.action]
}

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
  // «Traer del repo» trae lo entrante y, en los conflictos, hace ganar al
  // repositorio (se fuerzan todos a «theirs»). Es el «bajar» de toda la vida:
  // lo local que choca se reemplaza por lo del repo.
  const result = await pull(conflictPaths.value)
  if (!result) return
  const total = result.applied.length + result.deleted.length
  toast.success(total ? `Traídos ${total} archivo(s)` : 'No había nada que traer')
  if (result.conflicts.length) toast.warning(`Quedan ${result.conflicts.length} en conflicto`)
}

async function onCommit() {
  const result = await commit(message.value, stagedConflicts.value)
  if (!result) return
  toast.success(result.commit
    ? `Subido en ${result.commit.slice(0, 7)}`
    : 'No había nada preparado que subir')
  message.value = ''
}

async function onRestore(change: Change) {
  const result = await restore([change.path])
  if (result) toast.success(`Restaurado ${change.path}`)
}

async function onDisconnect() {
  await disconnect()
  toast.success('Enlace deshecho')
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

      <!-- Quien usa Texel no puede arreglar esto: es cosa de quien lo despliega,
           una sola vez. Así que aquí no se enseñan nombres de variables, se
           enseña a quién hay que decírselo y dónde está escrito el cómo. -->
      <template v-if="!configured">
        <p class="text-xs text-muted mt-0 mb-2">
          GitHub desconectado, sincronización entre proyectos próximamente.
        </p>
        <a :href="SETUP_DOCS" target="_blank" rel="noopener" class="btn w-full text-center">
          Cómo conectarse <ExternalLink :size="12" class="inline align-[-2px] ml-1" />
        </a>
      </template>

      <template v-else-if="!link">
        <p class="text-xs text-muted mt-0 mb-3">
          Enlaza este proyecto con la carpeta de un taller en un repositorio. A partir de
          ahí, lo que escribas aquí se sube con un botón, y lo que escribas en el
          editor de tu ordenador se trae con otro.
        </p>

        <!-- Sin haber iniciado sesión con GitHub no se sabe qué instalaciones
             son suyas, así que este es el único paso que se ofrece. -->
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
            sincronizar y vuelves aquí solo.
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

        <!-- Entrantes: lo que cambió en el repo. Se trae con «Traer del repo». -->
        <section v-if="incoming.length" class="mb-3">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted m-0 mb-2">
            Entrantes ({{ incoming.length }})
          </h3>
          <ul class="list-none p-0 m-0 grid gap-1">
            <li v-for="change in incoming" :key="change.path"
              class="row group flex items-center gap-2 text-xs">
              <span class="status-letter" :data-k="statusLetter(change)">{{ statusLetter(change) }}</span>
              <span class="font-mono truncate flex-1" :title="label(change)">{{ change.path }}</span>
            </li>
          </ul>
        </section>

        <!-- Cambios de aquí sin preparar: se preparan (+) o se descartan (↺). -->
        <section v-if="changes.length" class="mb-3">
          <div class="flex items-center gap-2 mb-2">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-muted m-0 flex-1">
              Cambios ({{ changes.length }})
            </h3>
            <button class="btn text-xs py-0.5" :disabled="!!busy" @click="stageAll">Preparar todo</button>
          </div>
          <ul class="list-none p-0 m-0 grid gap-1">
            <li v-for="change in changes" :key="change.path"
              class="row group flex items-center gap-2 text-xs">
              <span class="status-letter" :data-k="statusLetter(change)">{{ statusLetter(change) }}</span>
              <span class="font-mono truncate flex-1" :title="label(change)">{{ change.path }}</span>
              <button class="icon-btn w-6 h-6 opacity-0 group-hover:opacity-100 hover:text-[var(--danger)]"
                title="Descartar el cambio local (volver a lo del repo)"
                :disabled="!!busy" @click="onRestore(change)">
                <RotateCcw :size="12" />
              </button>
              <button class="icon-btn w-6 h-6 opacity-0 group-hover:opacity-100"
                title="Preparar" :disabled="!!busy" @click="stage(change.path)">
                <Plus :size="13" />
              </button>
            </li>
          </ul>
        </section>

        <!-- Preparados: lo que entra en el próximo commit. -->
        <section v-if="stagedChanges.length" class="mb-3">
          <div class="flex items-center gap-2 mb-2">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] m-0 flex-1">
              Preparados ({{ stagedChanges.length }})
            </h3>
            <button class="btn text-xs py-0.5" :disabled="!!busy" @click="unstageAll">Quitar todo</button>
          </div>
          <ul class="list-none p-0 m-0 grid gap-1">
            <li v-for="change in stagedChanges" :key="change.path"
              class="row group flex items-center gap-2 text-xs">
              <span class="status-letter" :data-k="statusLetter(change)">{{ statusLetter(change) }}</span>
              <span class="font-mono truncate flex-1" :title="label(change)">{{ change.path }}</span>
              <button class="icon-btn w-6 h-6 opacity-0 group-hover:opacity-100"
                title="Quitar del stage" :disabled="!!busy" @click="unstage(change.path)">
                <Minus :size="13" />
              </button>
            </li>
          </ul>
        </section>

        <input v-model="message" class="input w-full mb-2 text-xs"
          :placeholder="`texel: ${projectName}`">

        <!-- Las dos direcciones, siempre a la vista: bajar del repo y subir lo
             preparado. «Traer del repo» resuelve los conflictos a favor del repo. -->
        <div class="flex gap-2">
          <button class="btn flex-1" :disabled="!!busy || !canPull" @click="onPull"
            title="Trae lo del repositorio; en los conflictos gana la versión del repo">
            <ArrowDownToLine :size="13" class="inline align-[-2px] mr-1" />
            Traer del repo
          </button>
          <button class="btn-primary flex-1" :disabled="!!busy || !stagedChanges.length" @click="onCommit"
            title="Sube al repositorio solo lo que esté preparado">
            <ArrowUpFromLine :size="13" class="inline align-[-2px] mr-1" />
            Subir<span v-if="stagedChanges.length"> ({{ stagedChanges.length }})</span>
          </button>
        </div>

        <p v-if="!incoming.length && !outgoing.length" class="text-[11px] text-muted mt-2 mb-0 text-center">
          Todo al día con el repositorio.
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

<style scoped>
/* Letra de estado tipo git, con el color según la acción. */
.status-letter {
  width: 1rem;
  text-align: center;
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
}
.status-letter[data-k='A'] { color: var(--ok, #1b7a3d); }
.status-letter[data-k='M'] { color: var(--accent); }
.status-letter[data-k='D'] { color: var(--danger); }
.status-letter[data-k='!'] { color: var(--warning, #b8860b); }
.row { min-height: 1.5rem; }
</style>
