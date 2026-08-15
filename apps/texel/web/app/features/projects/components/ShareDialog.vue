<script setup lang="ts">
import { X, Copy, Check } from 'lucide-vue-next'
import type { ProjectRole } from '~/shared/types/database'

const props = defineProps<{ projectId: string }>()
const emit = defineEmits<{ close: [] }>()

const { members, isOwner, refresh, invite, setRole, removeMember } = useProjectMembers(() => props.projectId)
const user = useMe()

const role = ref<ProjectRole>('editor')
const email = ref('')
const link = ref('')
const copied = ref(false)
const error = ref('')

async function createInvite() {
  error.value = ''
  try {
    link.value = await invite(role.value, email.value.trim() || undefined)
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function copy() {
  await navigator.clipboard.writeText(link.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

onMounted(refresh)
</script>

<template>
  <div class="fixed inset-0 bg-black/30 backdrop-blur-sm grid place-items-center p-5" @click.self="emit('close')">
    <div class="glass-menu rounded-[var(--radius-lg)] p-5 w-full max-w-md">
      <header class="flex items-center mb-3">
        <h2 class="text-base font-semibold m-0">Compartir proyecto</h2>
        <span class="flex-1" />
        <button class="btn p-1" @click="emit('close')"><X :size="14" /></button>
      </header>

      <section class="mb-4">
        <p class="text-xs text-muted mt-0 mb-2">
          Crea un enlace de invitación. Si escribes un correo, solo esa persona podrá canjearlo.
        </p>
        <div class="flex gap-2 mb-2">
          <select v-model="role" class="input w-auto shrink-0">
            <option value="editor">Editor</option>
            <option value="viewer">Solo lectura</option>
          </select>
          <input v-model="email" class="input flex-1 min-w-0" placeholder="correo (opcional)">
          <button class="btn-primary shrink-0" @click="createInvite">Crear</button>
        </div>

        <div v-if="link" class="flex gap-2 items-center">
          <input :value="link" readonly class="input flex-1 min-w-0 text-xs font-mono">
          <button class="btn p-2" @click="copy">
            <component :is="copied ? Check : Copy" :size="14" />
          </button>
        </div>
        <p v-if="error" class="text-danger text-xs">{{ error }}</p>
      </section>

      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Miembros</h3>
        <ul class="list-none p-0 m-0 grid gap-1.5">
          <li v-for="m in members" :key="m.user_id" class="flex items-center gap-2 text-sm">
            <span
              class="w-5 h-5 rounded-full shrink-0"
              :style="{ background: m.profile?.color ?? 'var(--accent)' }"
            />
            <span class="flex-1 truncate">
              {{ m.profile?.display_name }}
              <span v-if="m.user_id === user?.id" class="text-muted text-xs">(tú)</span>
            </span>

            <select
              v-if="isOwner && m.role !== 'owner'"
              :value="m.role"
              class="input py-0.5 text-xs"
              @change="setRole(m.user_id, ($event.target as HTMLSelectElement).value as ProjectRole)"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Solo lectura</option>
            </select>
            <span v-else class="text-xs text-muted">{{ m.role }}</span>

            <button
              v-if="isOwner && m.role !== 'owner'"
              class="btn p-1"
              title="Quitar del proyecto"
              @click="removeMember(m.user_id)"
            >
              <X :size="12" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
