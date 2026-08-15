<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const email = ref('')
const sent = ref(false)
const error = ref('')
const busy = ref(false)

// Guarda a dónde volver tras el login (p. ej. una invitación abierta).
const route = useRoute()
const redirect = computed(() => (route.query.redirect as string) || '/')

async function magicLink() {
  busy.value = true
  error.value = ''
  const { error: e } = await supabase.auth.signInWithOtp({
    email: email.value.trim(),
    options: { emailRedirectTo: `${window.location.origin}/confirm?redirect=${encodeURIComponent(redirect.value)}` }
  })
  busy.value = false
  if (e) error.value = e.message
  else sent.value = true
}

async function google() {
  const { error: e } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/confirm?redirect=${encodeURIComponent(redirect.value)}` }
  })
  if (e) error.value = e.message
}

watchEffect(() => {
  if (user.value) navigateTo(redirect.value)
})
</script>

<template>
  <div class="min-h-full grid place-items-center px-5">
    <div class="card w-full max-w-sm">
      <h1 class="text-lg font-semibold mt-0 mb-1">Texel</h1>
      <p class="text-muted text-xs mt-0 mb-4">Editor LaTeX colaborativo</p>

      <template v-if="sent">
        <p class="text-sm">
          Te enviamos un enlace a <strong>{{ email }}</strong>. Ábrelo para entrar.
        </p>
        <button class="btn w-full mt-3" @click="sent = false">Usar otro correo</button>
      </template>

      <form v-else class="grid gap-2" @submit.prevent="magicLink">
        <input
          v-model="email"
          class="input"
          type="email"
          required
          placeholder="tu@urosario.edu.co"
          autocomplete="email"
        >
        <button class="btn-primary" type="submit" :disabled="busy">
          {{ busy ? 'Enviando…' : 'Enviar enlace de acceso' }}
        </button>
        <button class="btn" type="button" @click="google">Entrar con Google</button>
      </form>

      <p v-if="error" class="text-danger text-xs mt-3 mb-0">{{ error }}</p>
    </div>
  </div>
</template>
