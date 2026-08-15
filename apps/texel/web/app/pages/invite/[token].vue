<script setup lang="ts">
const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const token = route.params.token as string

const preview = ref<{ project_name: string, role: string, expired: boolean, used: boolean } | null>(null)
const error = ref('')
const busy = ref(false)

// invite_preview es una RPC security definer: enseña el nombre del proyecto sin
// exponer la tabla de invitaciones a quien todavía no es miembro.
const { data } = await supabase.rpc('invite_preview', { p_token: token })
preview.value = (data as never[])?.[0] ?? null

async function accept() {
  if (!user.value) {
    return navigateTo(`/auth?redirect=${encodeURIComponent(`/invite/${token}`)}`)
  }
  busy.value = true
  const { data: projectId, error: e } = await supabase.rpc('accept_invite', { p_token: token })
  busy.value = false
  if (e) { error.value = e.message; return }
  await navigateTo(`/p/${projectId}`)
}
</script>

<template>
  <div class="min-h-full grid place-items-center px-5">
    <div class="card w-full max-w-sm">
      <template v-if="!preview">
        <h1 class="text-lg font-semibold mt-0">Invitación no encontrada</h1>
        <p class="text-muted text-sm">El enlace no existe o fue revocado.</p>
      </template>

      <template v-else>
        <h1 class="text-lg font-semibold mt-0 mb-1">{{ preview.project_name }}</h1>
        <p class="text-muted text-xs mt-0 mb-4">
          Te invitaron como <strong>{{ preview.role }}</strong>.
        </p>

        <p v-if="preview.expired" class="text-danger text-sm">La invitación caducó.</p>
        <p v-else-if="preview.used" class="text-danger text-sm">La invitación ya fue usada.</p>
        <button v-else class="btn-primary w-full" :disabled="busy" @click="accept">
          {{ user ? 'Unirme al proyecto' : 'Iniciar sesión y unirme' }}
        </button>

        <p v-if="error" class="text-danger text-xs mt-3 mb-0">{{ error }}</p>
      </template>
    </div>
  </div>
</template>
