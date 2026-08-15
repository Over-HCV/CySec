<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useMe()

const email = ref('')
const password = ref('')
const sent = ref(false)
const error = ref('')
const busy = ref(false)

// Guarda a dónde volver tras el login (p. ej. una invitación abierta).
const route = useRoute()
const redirect = computed(() => (route.query.redirect as string) || '/')

// El acceso por contraseña solo se ofrece en desarrollo: en producción se entra
// por enlace mágico o Google, que no obligan a gestionar contraseñas.
const devLogin = import.meta.dev

async function withPassword() {
  busy.value = true
  error.value = ''
  const { error: e } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value
  })
  busy.value = false
  if (e) error.value = e.message
  else await navigateTo(redirect.value)
}

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
        <p class="text-muted text-xs">
          En desarrollo el correo no sale de tu máquina: míralo en
          <a href="http://127.0.0.1:54324" target="_blank">Mailpit</a>.
        </p>
        <button class="btn w-full mt-3" @click="sent = false">Volver</button>
      </template>

      <template v-else>
        <form class="grid gap-2" @submit.prevent="devLogin ? withPassword() : magicLink()">
          <input
            v-model="email"
            class="input"
            type="email"
            required
            placeholder="tu@urosario.edu.co"
            autocomplete="email"
          >
          <input
            v-if="devLogin"
            v-model="password"
            class="input"
            type="password"
            required
            placeholder="contraseña"
            autocomplete="current-password"
          >
          <button class="btn-primary" type="submit" :disabled="busy">
            {{ busy ? 'Entrando…' : devLogin ? 'Entrar' : 'Enviar enlace de acceso' }}
          </button>
        </form>

        <div class="grid gap-2 mt-2">
          <button v-if="devLogin" class="btn" type="button" :disabled="busy" @click="magicLink">
            Enviar enlace de acceso
          </button>
          <button class="btn" type="button" @click="google">Entrar con Google</button>
        </div>

        <p v-if="devLogin" class="text-muted text-xs mt-3 mb-0">
          Modo desarrollo: puedes entrar con contraseña. Usuarios de prueba
          <code>alice@test.local</code> y <code>bob@test.local</code>.
        </p>
      </template>

      <p v-if="error" class="text-danger text-xs mt-3 mb-0">{{ error }}</p>
    </div>
  </div>
</template>
