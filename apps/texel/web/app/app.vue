<script setup lang="ts">
const { current: wallpaper } = useWallpaper()

/** La piscina va a cámara superlenta (0.125×): a velocidad real el agua
 *  parece metraje de stock; lenta es lo que da la calma. Se reaplica cada
 *  vez que el <video> se monta, porque cambiar de fondo lo destruye. */
const pool = ref<HTMLVideoElement | null>(null)
watchEffect(() => {
  if (pool.value) pool.value.playbackRate = 0.4
})
</script>

<template>
  <!-- `data-macvue-glass="on"` enciende la lente de macvue en toda la aplicación:
       sin este atributo en algún ancestro, `MacGlassPanel` se queda en un blur
       plano y nunca refracta (ver `GlassLens` en @macvue/core).
       `data-accent` cambia el acento según el fondo: sobre «agua» todo es azul
       y el azul de macOS se pierde, así que ahí se usa turquesa (theme.css). -->
  <div class="h-full" data-macvue-glass="on" :data-accent="wallpaper === 'agua' || wallpaper === 'aqua' ? 'aqua' : null">
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
           distintas velocidades. Existen en los fondos animados («agua» y
           «heaven», que comparten movimiento con paletas distintas). -->
      <template v-if="wallpaper === 'agua' || wallpaper === 'heaven'">
        <div class="wall-water" />
        <div class="wall-caustics" />
        <div class="wall-caustics-2" />
        <div class="wall-rays" />
      </template>
    </div>

    <NuxtPage />
  </div>
</template>
