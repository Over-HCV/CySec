<template>
  <div class="h-full">
    <!-- Fondo: agua, cáusticas y rayos. Tres capas para que la luz se cruce a
         distintas velocidades; el CSS está en shared/styles/theme.css. -->
    <div class="app-backdrop" aria-hidden="true">
      <div class="wall-water" />
      <div class="wall-caustics" />
      <div class="wall-caustics-2" />
      <div class="wall-rays" />
    </div>

    <NuxtPage />
  </div>
</template>
