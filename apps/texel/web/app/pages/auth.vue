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

// La contraseña es la vía principal en todos los entornos: las cuentas se crean
// a mano en Supabase, así que quien entra ya tiene credenciales. El enlace
// mágico queda como alternativa, pero depende del SMTP del proyecto —el
// integrado de Supabase limita a unos pocos correos por hora y solo entrega a
// miembros de la organización—, de ahí que no sea el camino por defecto.
const isDev = import.meta.dev

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

watchEffect(() => {
  if (user.value) navigateTo(redirect.value)
})
</script>

<template>
  <div class="min-h-full grid place-items-center px-5">
    <div class="card w-full max-w-sm">
      <div class="flex items-center gap-2 mb-1">
        <img src="/assets/logo.png" alt="" width="28" height="28" class="shrink-0">
        <h1 class="text-lg font-semibold m-0">Texel</h1>
      </div>
      <p class="text-muted text-xs mt-0 mb-4">Editor LaTeX colaborativo</p>

      <template v-if="sent">
        <p class="text-sm">
          Te enviamos un enlace a <strong>{{ email }}</strong>. Ábrelo para entrar.
        </p>
        <p v-if="isDev" class="text-muted text-xs">
          En desarrollo el correo no sale de tu máquina: míralo en
          <a href="http://127.0.0.1:54324" target="_blank">Mailpit</a>.
        </p>
        <button class="btn w-full mt-3" @click="sent = false">Volver</button>
      </template>

      <template v-else>
        <form class="grid gap-2" @submit.prevent="withPassword">
          <input v-model="email" class="input" type="email" required placeholder="tu@urosario.edu.co"
            autocomplete="email">
          <input v-model="password" class="input" type="password" required placeholder="contraseña"
            autocomplete="current-password">
          <button class="btn-primary" type="submit" :disabled="busy">
            {{ busy ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <!-- Alternativa, no camino principal: entra sin contraseña pero
             depende de que el proyecto tenga SMTP configurado. -->
        <button class="btn w-full mt-2" type="button" :disabled="busy" @click="magicLink">
          Enviar enlace de acceso
        </button>
        <!-- 
        <p class="text-muted text-xs mt-3 mb-0">
          El acceso es por invitación: las cuentas las crea un administrador.
        </p>

        <p v-if="isDev" class="text-muted text-xs mt-1 mb-0">
          Modo desarrollo: usuarios de prueba <code>alice@test.local</code> y
          <code>bob@test.local</code>.
        </p> -->
      </template>

      <p v-if="error" class="text-danger text-xs mt-3 mb-0">{{ error }}</p>
    </div>
  </div>
</template>
