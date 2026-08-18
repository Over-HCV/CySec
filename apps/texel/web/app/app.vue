<script setup lang="ts">
/**
 * El fondo se lee aquí porque se pinta aquí. La apariencia y el detalle no —sus
 * atributos los pone `plugins/appearance.client.ts` en el `<html>`— pero sí se
 * llaman: es el `onMounted` de cada composable el que recupera lo guardado en
 * el navegador, y `app.vue` es lo único montado en todas las páginas. Sin estas
 * dos líneas, entrar directo a un proyecto se abría en claro y con el detalle
 * alto por mucho que se hubieran cambiado en la lista de proyectos.
 */
const { current: wallpaper } = useWallpaper()
useAppearance()
useDetail()

/** La piscina va a cámara lenta (0.4×): a velocidad real el agua parece
 *  metraje de stock; lenta es lo que da la calma. Se reaplica cada vez que
 *  el <video> se monta, porque cambiar de fondo lo destruye. */
const pool = ref<HTMLVideoElement | null>(null)
watchEffect(() => {
  if (pool.value) pool.value.playbackRate = 0.4
})
</script>

<template>
  <!-- Los atributos que deciden el aspecto —lente, detalle, acento, tema— no
       viven aquí sino en el `<html>`, que los pone `plugins/appearance.client.ts`:
       desde este `div` no alcanzaban a los menús, que se teleportan a `<body>`.
       Aquí queda solo el fondo, que sí pertenece a la página. -->
  <div class="h-full">
    <!-- Fondo de la ventana. Es lo que el cristal refracta, así que su detalle
         importa tanto como el de los paneles; el CSS está en shared/styles/theme.css. -->
    <div class="app-backdrop" :class="`app-backdrop--${wallpaper}`" aria-hidden="true">
      <!-- «Aqua»: vídeo de piscina en bucle a cámara lenta. Mudo, sin controles,
           sin PiP y sin foco: el contenedor ya ignora el puntero, así que no hay
           nada que pulsar ni arrastrar — es solo luz moviéndose. -->
      <video
        v-if="wallpaper === 'aqua'"
        ref="pool"
        src="/assets/aqua.mp4"
        autoplay
        muted
        loop
        playsinline
        disablepictureinpicture
        tabindex="-1"
        aria-hidden="true"
      />

      <!-- Agua, cáusticas y rayos: tres capas para que la luz se cruce a
           distintas velocidades. Solo existen en el fondo animado «sky». -->
      <template v-if="wallpaper === 'sky'">
        <div class="wall-water" />
        <div class="wall-caustics" />
        <div class="wall-caustics-2" />
        <div class="wall-rays" />
      </template>
    </div>

    <NuxtPage />
  </div>
</template>
