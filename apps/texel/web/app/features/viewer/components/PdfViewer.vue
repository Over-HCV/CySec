<script setup lang="ts">
/**
 * Visor de PDF con pdf.js. Renderiza todas las páginas en canvas y expone:
 *  - highlight(page, rect)  → resaltado del salto directo (SyncTeX forward)
 *  - evento `pdfClick`      → coordenadas en el PDF para el salto inverso
 */
import type { PDFDocumentProxy } from 'pdfjs-dist'

const props = defineProps<{ src: string | null }>()
const emit = defineEmits<{ pdfClick: [{ page: number, x: number, y: number }] }>()

const container = ref<HTMLElement>()
const pageCount = ref(0)
const scale = ref(1.4)
const rendering = ref(false)
const highlight = ref<{ page: number, x: number, y: number, w: number, h: number } | null>(null)

let pdf: PDFDocumentProxy | null = null

async function loadPdfjs() {
  // Import dinámico: pdf.js no debe entrar en el bundle del servidor.
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

async function render() {
  if (!props.src || !container.value) return
  rendering.value = true
  try {
    const pdfjs = await loadPdfjs()
    pdf = await pdfjs.getDocument(props.src).promise
    pageCount.value = pdf.numPages
    container.value.innerHTML = ''

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const viewport = page.getViewport({ scale: scale.value })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.className = 'block mx-auto mb-3 shadow'
      canvas.dataset.page = String(n)
      container.value.appendChild(canvas)
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
    }
  } finally {
    rendering.value = false
  }
}

function onClick(event: MouseEvent) {
  const canvas = (event.target as HTMLElement).closest('canvas')
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  // SyncTeX trabaja en puntos TeX, no en píxeles: se deshace la escala.
  emit('pdfClick', {
    page: Number(canvas.dataset.page),
    x: (event.clientX - rect.left) / scale.value,
    y: (event.clientY - rect.top) / scale.value
  })
}

/** Resalta la zona que devuelve SyncTeX y hace scroll hasta ella. */
function showHighlight(area: { page: number, x: number, y: number, w: number, h: number }) {
  highlight.value = area
  const canvas = container.value?.querySelector<HTMLCanvasElement>(`canvas[data-page="${area.page}"]`)
  canvas?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => { highlight.value = null }, 2000)
}

watch(() => props.src, render, { immediate: true })
watch(scale, render)

defineExpose({ showHighlight })
</script>

<template>
  <div class="h-full flex flex-col bg-sunken">
    <header class="flex items-center gap-2 px-3 h-10 border-b border-border text-xs text-muted">
      <span>{{ pageCount ? `${pageCount} páginas` : 'Sin PDF todavía' }}</span>
      <span class="flex-1" />
      <button class="btn py-0.5 px-2" :disabled="scale <= 0.6" @click="scale = +(scale - 0.2).toFixed(1)">−</button>
      <span>{{ Math.round(scale * 100) }}%</span>
      <button class="btn py-0.5 px-2" :disabled="scale >= 3" @click="scale = +(scale + 0.2).toFixed(1)">+</button>
    </header>

    <div class="relative flex-1 overflow-auto p-3">
      <div ref="container" @click="onClick" />

      <div
        v-if="highlight"
        class="pointer-events-none absolute bg-yellow-400/40 border border-yellow-500 transition-opacity"
        :style="{
          left: `${highlight.x * scale}px`,
          top: `${highlight.y * scale}px`,
          width: `${Math.max(highlight.w * scale, 12)}px`,
          height: `${Math.max(highlight.h * scale, 12)}px`
        }"
      />

      <p v-if="!src" class="text-center text-muted text-sm mt-10">
        Compila el proyecto para ver el PDF.
      </p>
      <p v-else-if="rendering" class="text-center text-muted text-sm mt-10">Renderizando…</p>
    </div>
  </div>
</template>
