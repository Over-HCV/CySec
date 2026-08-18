<script setup lang="ts">
/**
 * Visor de PDF con pdf.js.
 *
 * El scroll vive en el contenedor, nunca en la página: las páginas se dibujan
 * al ancho disponible («ajustar») o al zoom elegido, y si el zoom desborda, el
 * propio contenedor scrollea en horizontal.
 *
 * Solo se rasteriza lo que está a la vista. Cada página tiene siempre su hueco
 * —un `<div>` con el tamaño exacto, así que la barra de scroll es correcta desde
 * el primer momento— y el `<canvas>` entra y sale de ese hueco según pasa por
 * delante. La razón es el tamaño: a media pantalla, una página Letter ocupa un
 * canvas de 1536×1988 px, o sea ~12 MB de memoria de vídeo. Pintarlas todas a la
 * vez son 244 MB en un documento de veinte páginas, y ahí el navegador deja de
 * poder mantener las texturas y re-rasteriza en cada scroll.
 */
import { Minus, Plus, Maximize2 } from 'lucide-vue-next'
import type { PageViewport, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'

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

/** Huecos de página, por número de página. Existen aunque no estén pintados. */
const slots = new Map<number, HTMLElement>()
/** Páginas que el observer ve ahora mismo: lo que hay que tener pintado. */
const onScreen = new Set<number>()
/** Rasterizados en curso, para poder cancelarlos si la página se va. */
const tasks = new Map<number, RenderTask>()
let visibility: IntersectionObserver | null = null

/** Retina sí, pero con tope: a partir de 2 el canvas se dispara y no se nota. */
const MAX_DPR = 2

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

/** Suelta el canvas de una página y sus zonas clicables. */
function releasePage(n: number) {
  tasks.get(n)?.cancel()
  tasks.delete(n)
  // La capa de enlaces se va con el canvas: si se quedara, al repintar la
  // página habría dos superpuestas y los enlaces responderían dos veces.
  slots.get(n)?.querySelector('[data-links]')?.remove()
  const canvas = slots.get(n)?.querySelector('canvas')
  if (!canvas) return
  // Ponerlo a cero antes de quitarlo del DOM: es lo que devuelve de verdad los
  // megabytes del búfer, quitar el nodo solo lo deja a merced del recolector.
  canvas.width = 0
  canvas.height = 0
  canvas.remove()
}

/** Rasteriza una página dentro de su hueco, si no lo está ya. */
async function paintPage(n: number, token: number) {
  const slot = slots.get(n)
  if (!pdf || !slot || slot.querySelector('canvas') || tasks.has(n)) return

  const page = await pdf.getPage(n)
  // La página puede haberse ido de la pantalla —o el documento entero haber
  // cambiado— mientras se resolvía el `getPage`.
  if (token !== renderToken || !onScreen.has(n)) return

  const viewport = page.getViewport({ scale: appliedScale.value })
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width * dpr)
  canvas.height = Math.floor(viewport.height * dpr)
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`
  canvas.className = 'block'
  // El canvas se inserta en el documento ANTES de pintarlo: con un canvas suelto
  // (en un DocumentFragment) la promesa de page.render() no resuelve.
  slot.appendChild(canvas)

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  const task = page.render({ canvasContext: ctx, viewport })
  tasks.set(n, task)
  rendering.value = true

  // Sin esperar al rasterizado: leer las anotaciones no depende de él, y así
  // los enlaces están vivos en cuanto se ve la página.
  void paintLinks(page, slot, viewport, token)

  try {
    await task.promise
  } catch {
    // Cancelar un render rechaza la promesa: es lo normal al desplazarse
    // rápido, no un fallo. El canvas ya lo ha quitado `releasePage`.
  } finally {
    tasks.delete(n)
    rendering.value = tasks.size > 0
  }
}

/**
 * Zonas clicables de una página: los enlaces que deja `hyperref`.
 *
 * A mano y no con el `AnnotationLayer` de pdf.js porque de todo lo que sabe
 * dibujar —formularios, notas, popups— aquí solo hacen falta los enlaces, y
 * montarlo arrastra su hoja de estilos y su `linkService`. Un `<a>` por
 * anotación encima del canvas hace exactamente lo mismo para este caso.
 */
async function paintLinks(page: PDFPageProxy, slot: HTMLElement, viewport: PageViewport, token: number) {
  const n = Number(slot.dataset.page)
  if (slot.querySelector('[data-links]')) return

  const annotations = await page.getAnnotations({ intent: 'display' })
  // Igual que en `paintPage`: la página puede haberse ido mientras se resolvía.
  if (token !== renderToken || !onScreen.has(n)) return

  const links = annotations.filter(a => a.subtype === 'Link' && (a.url || a.dest))
  if (!links.length) return

  const layer = document.createElement('div')
  layer.dataset.links = ''
  layer.className = 'absolute inset-0'

  for (const link of links) {
    // El rectángulo del PDF puede venir con las esquinas al revés; tras pasarlo
    // a coordenadas de pantalla el eje Y además se invierte.
    const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(link.rect) as number[]
    const el = document.createElement('a')
    el.className = 'pdf-link'
    el.style.left = `${Math.min(x1!, x2!)}px`
    el.style.top = `${Math.min(y1!, y2!)}px`
    el.style.width = `${Math.abs(x2! - x1!)}px`
    el.style.height = `${Math.abs(y2! - y1!)}px`

    if (link.url) {
      el.href = link.url
      el.target = '_blank'
      el.rel = 'noopener noreferrer'
      el.title = link.url
    } else {
      el.href = '#'
      el.addEventListener('click', (event) => {
        event.preventDefault()
        void goToDest(link.dest)
      })
    }
    // Sin esto el clic llega también a `onClick` y pide un SyncTeX inverso de
    // una posición que el usuario no ha pedido.
    el.addEventListener('click', event => event.stopPropagation())
    layer.appendChild(el)
  }

  slot.appendChild(layer)
}

/** Enlace interno (índice, referencia cruzada): saltar a esa página. */
async function goToDest(dest: string | unknown[]) {
  if (!pdf) return
  const explicit = typeof dest === 'string' ? await pdf.getDestination(dest) : dest
  const ref = (explicit as { num: number, gen: number }[] | null)?.[0]
  if (!ref) return
  // El hueco existe aunque la página no esté pintada; el observer la pinta al
  // llegar, igual que en `showHighlight`.
  slots.get(await pdf.getPageIndex(ref) + 1)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

    for (const n of slots.keys()) releasePage(n)
    slots.clear()
    onScreen.clear()
    visibility?.disconnect()
    canvasHost.value.replaceChildren()

    // Un hueco por página, con su tamaño real. `getPage` solo lee el diccionario
    // de la página, no rasteriza: medirlas todas es barato y a cambio el alto
    // total del scroll es el definitivo desde el principio, sin saltos.
    visibility = new IntersectionObserver(onVisibility, {
      root: scroller.value,
      // Una pantalla de margen arriba y abajo: la página está pintada antes de
      // que asome, así que desplazarse no enseña huecos en blanco.
      rootMargin: '100% 0px'
    })

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      // El componente puede desmontarse (o recargarse por HMR) en mitad del
      // bucle: sin esta comprobación, appendChild explota sobre un host nulo.
      if (token !== renderToken || !canvasHost.value) return
      const viewport = page.getViewport({ scale })
      const slot = document.createElement('div')
      slot.style.width = `${viewport.width}px`
      slot.style.height = `${viewport.height}px`
      // La sombra y las esquinas van en el hueco, no en el canvas: redondear un
      // canvas de megapíxeles obliga a recortar toda la superficie.
      slot.className = 'relative mx-auto mb-3 rounded-[2px] bg-white shadow-[0_1px_6px_rgba(0,0,0,.22)]'
      slot.dataset.page = String(n)
      canvasHost.value.appendChild(slot)
      slots.set(n, slot)
      visibility.observe(slot)
    }
  } finally {
    // Sin condición: si un render queda superado por otro y solo el «último»
    // limpiara la bandera, un relevo a destiempo dejaba el panel en
    // «renderizando…» para siempre.
    rendering.value = tasks.size > 0
  }
}

function onVisibility(entries: IntersectionObserverEntry[]) {
  const token = renderToken
  for (const entry of entries) {
    const n = Number((entry.target as HTMLElement).dataset.page)
    if (entry.isIntersecting) {
      onScreen.add(n)
      void paintPage(n, token)
    } else {
      onScreen.delete(n)
      releasePage(n)
    }
  }
}

function onClick(event: MouseEvent) {
  // Por el hueco y no por el canvas: el hueco existe aunque la página todavía
  // no se haya pintado, y sus coordenadas son las mismas.
  const slot = (event.target as HTMLElement).closest<HTMLElement>('[data-page]')
  if (!slot) return
  const rect = slot.getBoundingClientRect()
  // SyncTeX trabaja en puntos TeX: se deshace la escala aplicada.
  emit('pdfClick', {
    page: Number(slot.dataset.page),
    x: (event.clientX - rect.left) / appliedScale.value,
    y: (event.clientY - rect.top) / appliedScale.value
  })
}

/** Resalta la zona que devuelve SyncTeX y hace scroll hasta ella. */
function showHighlight(area: { page: number, x: number, y: number, w: number, h: number }) {
  highlight.value = area
  // El hueco de la página siempre está ahí; el observer la pinta al llegar.
  slots.get(area.page)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
  if (document.visibilityState !== 'visible' || !props.src) return
  // Sin huecos no hay documento montado: hay que rehacerlo entero.
  if (!slots.size) { void render(); return }
  // Con huecos, lo que puede haberse quedado a medias son las páginas que
  // estaban a la vista al irse.
  for (const n of onScreen) void paintPage(n, renderToken)
}
onMounted(() => document.addEventListener('visibilitychange', onVisible))

onBeforeUnmount(() => {
  observer?.disconnect()
  visibility?.disconnect()
  for (const n of slots.keys()) releasePage(n)
  slots.clear()
  onScreen.clear()
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
