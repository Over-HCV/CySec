<script setup lang="ts">
const { current: wallpaper } = useWallpaper()
const { current: detail } = useDetail()

/** La piscina va a cámara lenta (0.4×): a velocidad real el agua parece
 *  metraje de stock; lenta es lo que da la calma. Se reaplica cada vez que
 *  el <video> se monta, porque cambiar de fondo lo destruye. */
const pool = ref<HTMLVideoElement | null>(null)
watchEffect(() => {
  if (pool.value) pool.value.playbackRate = 0.4
})
</script>

<template>
  <!-- `data-macvue-glass="on"` enciende la lente de macvue en toda la aplicación:
       sin este atributo en algún ancestro, `MacGlassPanel` se queda en un blur
       plano y nunca refracta (ver `GlassLens` en @macvue/core). Es justo lo que
       queremos apagar en detalle «bajo», y por eso el interruptor vive aquí y no
       en cada panel: un atributo, y toda la app cambia de camino de pintado.
       `data-accent` cambia el acento según el fondo: sobre «sky» y «aqua»
       todo es azul y el de macOS se pierde, así que ahí va turquesa. -->
  <div
    class="h-full"
    :data-macvue-glass="detail === 'alto' ? 'on' : 'off'"
    :data-detail="detail"
    :data-accent="wallpaper === 'sky' || wallpaper === 'aqua' ? 'aqua' : null"
  >
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
