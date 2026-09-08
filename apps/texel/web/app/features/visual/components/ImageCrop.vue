<script setup lang="ts">
/**
 * Recortar una imagen sin tocarla.
 *
 * Aquí siempre se ve la imagen **entera**, con el rectángulo encima: recortar no
 * consume nada, así que volver a abrir esto con un recorte ya puesto enseña otra
 * vez el original y el rectángulo donde se dejó. Lo que sale por `apply` son
 * fracciones de la imagen natural, y quien las escribe es `useBlocks.setCrop`,
 * en el `trim={…},clip` del LaTeX. El archivo de `pics/` no se entera.
 *
 * La aritmética entera vive en `lib/crop.ts`; aquí solo se traducen píxeles de
 * pantalla a fracciones, que es lo único que necesita el DOM.
 */
import { Crop as CropIcon, X } from 'lucide-vue-next'
import { clampCrop, FULL_CROP, isFullCrop, moveCrop, resizeCrop, windowOf, type Crop, type Handle }
  from '../lib/crop'

const props = defineProps<{
  src: string
  /** El recorte que ya tenía; `null` es la imagen entera. */
  crop: Crop | null
  /** El pie, solo para titular el diálogo con algo reconocible. */
  nombre: string
}>()

const emit = defineEmits<{
  /** El recorte nuevo; `null` es «quítalo». */
  apply: [crop: Crop | null]
  close: []
}>()

const actual = ref<Crop>(props.crop ?? { ...FULL_CROP })
const marco = useTemplateRef<HTMLElement>('marco')

/** Las ocho manijas, con la posición que ocupan en el borde del rectángulo. */
const HANDLES: { handle: Handle, x: number, y: number, cursor: string }[] = [
  { handle: 'tl', x: 0, y: 0, cursor: 'nwse-resize' },
  { handle: 't', x: 0.5, y: 0, cursor: 'ns-resize' },
  { handle: 'tr', x: 1, y: 0, cursor: 'nesw-resize' },
  { handle: 'r', x: 1, y: 0.5, cursor: 'ew-resize' },
  { handle: 'br', x: 1, y: 1, cursor: 'nwse-resize' },
  { handle: 'b', x: 0.5, y: 1, cursor: 'ns-resize' },
  { handle: 'bl', x: 0, y: 1, cursor: 'nesw-resize' },
  { handle: 'l', x: 0, y: 0.5, cursor: 'ew-resize' }
]

const rect = computed(() => windowOf(actual.value))
const recortado = computed(() => !isFullCrop(actual.value))

/**
 * Arrastrar, sea una manija o el rectángulo entero.
 *
 * Se parte del recorte que había al empezar y se le suma el desplazamiento
 * total, no el de cada `mousemove`: así el redondeo no se acumula y soltar y
 * volver a coger deja el rectángulo exactamente donde se veía.
 */
function empezar(event: PointerEvent, handle: Handle | null) {
  const caja = marco.value?.getBoundingClientRect()
  if (!caja || !caja.width || !caja.height) return
  const desde = { ...actual.value }
  const x0 = event.clientX
  const y0 = event.clientY
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)

  function mover(e: PointerEvent) {
    const dx = (e.clientX - x0) / caja!.width
    const dy = (e.clientY - y0) / caja!.height
    actual.value = handle ? resizeCrop(desde, handle, dx, dy) : moveCrop(desde, dx, dy)
  }

  function soltar() {
    target.removeEventListener('pointermove', mover)
    target.removeEventListener('pointerup', soltar)
    target.removeEventListener('pointercancel', soltar)
    actual.value = clampCrop(actual.value)
  }

  target.addEventListener('pointermove', mover)
  target.addEventListener('pointerup', soltar)
  target.addEventListener('pointercancel', soltar)
}

function aplicar() {
  emit('apply', recortado.value ? actual.value : null)
}

function quitar() {
  actual.value = { ...FULL_CROP }
  emit('apply', null)
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close') }
  if (event.key === 'Enter') { event.preventDefault(); aplicar() }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center p-5"
    @click.self="emit('close')">
    <div class="glass-menu rounded-[var(--radius-lg)] p-5 w-full max-w-2xl">
      <header class="flex items-center gap-2 mb-3">
        <CropIcon :size="15" />
        <h2 class="text-base font-semibold m-0">Recortar</h2>
        <code class="text-[11px] text-[var(--text-faint)] font-mono truncate">{{ nombre }}</code>
        <span class="flex-1" />
        <button class="btn p-1" title="Cerrar" @click="emit('close')"><X :size="14" /></button>
      </header>

      <!-- La imagen entera, siempre: el recorte es una ventana encima, no un
           corte. Por eso se puede mover, ampliar y quitar cuantas veces sea. -->
      <div class="encuadre">
        <div ref="marco" class="marco">
          <img :src="src" :alt="nombre" class="foto" draggable="false">
          <div class="sombra" :style="{
            clipPath: `polygon(0% 0%, 0% 100%, ${rect.left}% 100%, ${rect.left}% ${rect.top}%,`
              + `${rect.left + rect.width}% ${rect.top}%, ${rect.left + rect.width}% ${rect.top + rect.height}%,`
              + `${rect.left}% ${rect.top + rect.height}%, ${rect.left}% 100%, 100% 100%, 100% 0%)`
          }" />

          <div class="ventana" :style="{
            left: `${rect.left}%`, top: `${rect.top}%`,
            width: `${rect.width}%`, height: `${rect.height}%`
          }" @pointerdown.prevent="empezar($event, null)">
            <div class="tercios" />
            <button v-for="h in HANDLES" :key="h.handle" class="manija" :style="{
              left: `${h.x * 100}%`, top: `${h.y * 100}%`, cursor: h.cursor
            }" title="Ajustar el borde" @pointerdown.prevent.stop="empezar($event, h.handle)" />
          </div>
        </div>
      </div>

      <p class="text-[11px] text-[var(--text-faint)] mt-2 mb-0">
        La imagen no se modifica: el recorte se guarda como un parámetro del
        documento, así que se puede cambiar o quitar cuando quieras.
      </p>

      <footer class="flex items-center gap-2 mt-4">
        <button class="btn" :disabled="!recortado" @click="quitar">Quitar recorte</button>
        <span class="flex-1" />
        <button class="btn" @click="emit('close')">Cancelar</button>
        <button class="btn-primary" @click="aplicar">Aplicar</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* El marco se ajusta a la imagen, no al diálogo: si no, una foto vertical
   dejaría la sombra y el rectángulo flotando sobre el fondo del panel, y las
   fracciones del arrastre se medirían contra una caja que no es la imagen. */
.encuadre {
  display: flex;
  justify-content: center;
  border-radius: var(--radius);
  background: var(--bg-sunken);
  overflow: hidden;
}

.marco {
  position: relative;
  line-height: 0;
  max-width: 100%;
  touch-action: none;
  user-select: none;
}

.foto {
  display: block;
  max-height: 60vh;
  max-width: 100%;
  object-fit: contain;
}

/* Lo que queda fuera del rectángulo, oscurecido. Es un solo elemento recortado
   con `clip-path` en vez de cuatro bandas: así no hay costuras al arrastrar. */
.sombra {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 55%);
  pointer-events: none;
}

.ventana {
  position: absolute;
  outline: 1px solid var(--accent);
  cursor: move;
}

.tercios {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, transparent 33.33%, rgb(255 255 255 / 25%) 33.33% calc(33.33% + 1px),
      transparent calc(33.33% + 1px) 66.66%, rgb(255 255 255 / 25%) 66.66% calc(66.66% + 1px),
      transparent calc(66.66% + 1px)),
    linear-gradient(to bottom, transparent 33.33%, rgb(255 255 255 / 25%) 33.33% calc(33.33% + 1px),
      transparent calc(33.33% + 1px) 66.66%, rgb(255 255 255 / 25%) 66.66% calc(66.66% + 1px),
      transparent calc(66.66% + 1px));
  pointer-events: none;
}

.manija {
  position: absolute;
  width: 11px;
  height: 11px;
  margin: -6px 0 0 -6px;
  padding: 0;
  border: 1px solid var(--accent);
  border-radius: 2px;
  background: var(--bg-raised, #fff);
}
</style>
