<script setup lang="ts">
// Aterrizaje del enlace mágico / OAuth. @nuxtjs/supabase ya intercambió el
// código por sesión antes de montar esta página; aquí solo se redirige.
const user = useSupabaseUser()
const route = useRoute()

watchEffect(() => {
  if (user.value) navigateTo((route.query.redirect as string) || '/')
})
</script>

<template>
  <div class="min-h-full grid place-items-center">
    <p class="text-muted text-sm">Confirmando la sesión…</p>
  </div>
</template>
