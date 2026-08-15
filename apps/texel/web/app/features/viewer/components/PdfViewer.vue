<script setup lang="ts">
/**
 * Visor de PDF con pdf.js.
 *
 * El scroll vive en el contenedor, nunca en la página: las páginas se dibujan
 * al ancho disponible («ajustar») o al zoom elegido, y si el zoom desborda, el
 * propio contenedor scrollea en horizontal.
 */
import { Minus, Plus, Maximize2 } from 'lucide-vue-next'
import type { PDFDocumentProxy } from 'pdfjs-dist'

const props = defineProps<{ src: string | null }>()
const emit = defineEmits<{ pdfClick: [{ page: number, x: number, y: number }] }>()

const scroller = ref<HTMLElement>()
const canvasHost = ref<HTMLElement>()
const pageCount = ref(0)
const rendering = ref(false)
const fitWidth = ref(true)
const zoom = ref(1)                       // solo se usa si fitWidth = false
const appliedScale = ref(1)               // escala real con la que se pintó
const highlight = ref<{ page: number, x: number, y: number, w: number, h: number } | null>(null)

let pdf: PDFDocumentProxy | null = null
let renderToken = 0

async function loadPdfjs() {
  // Import dinámico: pdf.js no debe entrar en el bundle del servidor.
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

let inFlight: Promise<void> = Promise.resolve()

/** Encola un repintado: dos renders a la vez se pisan los canvas. */
function render(): Promise<void> {
  inFlight = inFlight.catch(() => {}).then(() => paint())
  return inFlight
}

async function paint() {
  if (!props.src || !canvasHost.value || !scroller.value) return
  const token = ++renderToken
  rendering.value = true

  try {
    const pdfjs = await loadPdfjs()
    if (!pdf || pdf.fingerprints?.[0] === undefined) pdf = await pdfjs.getDocument(props.src).promise
    if (token !== renderToken) return
    pageCount.value = pdf.numPages

    // Ancho útil descontando el padding del scroller y el hueco de la barra.
    const available = scroller.value.clientWidth - 32
    const first = await pdf.getPage(1)
    const natural = first.getViewport({ scale: 1 }).width
    const scale = fitWidth.value ? Math.max(available / natural, 0.25) : zoom.value
    appliedScale.value = scale

    // Los canvas se insertan en el documento ANTES de pintarlos: con un canvas
    // suelto (en un DocumentFragment) la promesa de page.render() no resuelve.
    canvasHost.value.replaceChildren()

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      // El componente puede desmontarse (o recargarse por HMR) en mitad del
      // bucle: sin esta comprobación, appendChild explota sobre un host nulo.
      if (token !== renderToken || !canvasHost.value) return
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      // devicePixelRatio: sin esto el texto se ve borroso en pantallas Retina.
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(viewport.width * dpr)
      canvas.height = Math.floor(viewport.height * dpr)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      canvas.className = 'block mx-auto mb-3 rounded-[2px] shadow-[0_1px_6px_rgba(0,0,0,.22)]'
      canvas.dataset.page = String(n)
      canvasHost.value.appendChild(canvas)
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      await page.render({ canvasContext: ctx, viewport }).promise
    }
  } finally {
    // Sin condición: si un render queda superado por otro y solo el «último»
    // limpiara la bandera, un relevo a destiempo dejaba el panel en
    // «renderizando…» para siempre.
    rendering.value = false
  }
}

function onClick(event: MouseEvent) {
  const canvas = (event.target as HTMLElement).closest('canvas')
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  // SyncTeX trabaja en puntos TeX: se deshace la escala aplicada.
  emit('pdfClick', {
    page: Number(canvas.dataset.page),
    x: (event.clientX - rect.left) / appliedScale.value,
    y: (event.clientY - rect.top) / appliedScale.value
  })
}

/** Resalta la zona que devuelve SyncTeX y hace scroll hasta ella. */
function showHighlight(area: { page: number, x: number, y: number, w: number, h: number }) {
  highlight.value = area
  const canvas = canvasHost.value?.querySelector<HTMLCanvasElement>(`canvas[data-page="${area.page}"]`)
  canvas?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => { highlight.value = null }, 2200)
}

function setZoom(delta: number) {
  fitWidth.value = false
  zoom.value = Math.min(Math.max(+(appliedScale.value + delta).toFixed(2), 0.4), 3)
}

// El PDF cambia de documento: se descarta el anterior.
watch(() => props.src, () => { pdf = null; void render() }, { immediate: true })
watch([fitWidth, zoom], () => void render())

// Al redimensionar el panel hay que repintar si estamos en modo «ajustar».
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let observer: ResizeObserver | null = null
let lastWidth = 0
onMounted(() => {
  observer = new ResizeObserver((entries) => {
    if (!fitWidth.value) return
    // Se observa el panel, no el contenedor con scroll: el ancho del panel lo
    // decide el flex, no el contenido, así que no se realimenta al pintar.
    const width = entries[0]?.contentRect.width ?? 0
    // Sin este umbral el observer se realimenta: pintar páginas cambia el alto,
    // aparece la barra de scroll, cambia el ancho, se vuelve a pintar… y el
    // panel se queda en «renderizando…» para siempre.
    if (Math.abs(width - lastWidth) < 8) return
    lastWidth = width
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => void render(), 150)
  })
  if (scroller.value?.parentElement) observer.observe(scroller.value.parentElement)
})
// pdf.js encadena el pintado con requestAnimationFrame, que el navegador
// congela en pestañas ocultas: si compilas y te vas a otra pestaña, el render
// se queda a medias. Al volver, se repinta.
function onVisible() {
  if (document.visibilityState === 'visible' && props.src && !canvasHost.value?.childElementCount) {
    void render()
  }
}
onMounted(() => document.addEventListener('visibilitychange', onVisible))

onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('visibilitychange', onVisible)
})

defineExpose({ showHighlight })
</script>

<template>
  <div class="h-full flex flex-col pane">
    <header class="flex items-center gap-2 px-2 h-[var(--bar-h)] shrink-0 border-b border-[var(--macvue-material-glass-regular-rim)]">
      <span class="text-[11px] text-[var(--text-muted)] pl-1">
        {{ pageCount ? `${pageCount} páginas` : 'Sin PDF' }}
      </span>
      <span v-if="rendering" class="text-[11px] text-[var(--text-faint)]">renderizando…</span>
      <span class="flex-1" />

      <button class="icon-btn" title="Ajustar al ancho" :class="fitWidth ? 'text-[var(--accent)]' : ''" @click="fitWidth = true">
        <Maximize2 :size="13" />
      </button>
      <button class="icon-btn" title="Alejar" @click="setZoom(-0.15)"><Minus :size="13" /></button>
      <span class="text-[11px] text-[var(--text-muted)] tabular-nums w-9 text-center">
        {{ Math.round(appliedScale * 100) }}%
      </span>
      <button class="icon-btn" title="Acercar" @click="setZoom(0.15)"><Plus :size="13" /></button>
    </header>

    <!-- scrollbar-gutter estable: si la barra apareciera y desapareciera, el
         ancho útil cambiaría en cada pintado. -->
    <div ref="scroller" class="relative flex-1 overflow-auto p-4 pane" style="scrollbar-gutter: stable">
      <div ref="canvasHost" class="relative w-max min-w-full mx-auto" @click="onClick" />

      <div
        v-if="highlight"
        class="pointer-events-none absolute rounded-[2px] bg-[color:var(--accent)]/25 ring-1 ring-[var(--accent)]"
        :style="{
          left: `${highlight.x * appliedScale + 16}px`,
          top: `${highlight.y * appliedScale + 16}px`,
          width: `${Math.max(highlight.w * appliedScale, 14)}px`,
          height: `${Math.max(highlight.h * appliedScale, 14)}px`
        }"
      />

      <p v-if="!src" class="text-center text-[var(--text-faint)] text-xs mt-10">
        Compila el proyecto para ver el PDF.
      </p>
    </div>
  </div>
</template>
