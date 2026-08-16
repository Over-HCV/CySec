<script setup lang="ts">
const { current: wallpaper } = useWallpaper()
</script>

<template>
  <!-- `data-macvue-glass="on"` enciende la lente de macvue en toda la aplicación:
       sin este atributo en algún ancestro, `MacGlassPanel` se queda en un blur
       plano y nunca refracta (ver `GlassLens` en @macvue/core). -->
  <div class="h-full" data-macvue-glass="on">
    <!-- Fondo de la ventana. Es lo que el cristal refracta, así que su detalle
         importa tanto como el de los paneles; el CSS está en shared/styles/theme.css. -->
    <div class="app-backdrop" :class="`app-backdrop--${wallpaper}`" aria-hidden="true">
      <!-- Agua, cáusticas y rayos: tres capas para que la luz se cruce a
           distintas velocidades. Solo existen en el fondo animado. -->
      <template v-if="wallpaper === 'agua'">
        <div class="wall-water" />
        <div class="wall-caustics" />
        <div class="wall-caustics-2" />
        <div class="wall-rays" />
      </template>
    </div>

    <NuxtPage />
  </div>
</template>
