<script setup lang="ts">
/**
 * Un bloque de imagen: miniatura, pie y ancho.
 *
 * Es el único tipo con componente propio. El resto comparte el marco de
 * `BlockNode` porque todos son lo mismo —una fila con campos—, pero una imagen
 * trae píxeles: hay que pedir una URL firmada, esperar a que llegue y decir algo
 * cuando el archivo no está. Meterlo en `BlockNode` habría sido esconder un
 * componente dentro de otro.
 *
 * El bloque abarca el `\begin{figure}…\end{figure}` entero, así que el
 * `\centering`, el `[htbp]` y el `\label` siguen ahí aunque no se pinten: se
 * conservan byte a byte, como cualquier otro bloque que nadie toca.
 */
import { ImageOff, RefreshCw } from 'lucide-vue-next'
import { FIGURE_WIDTH } from '../lib/catalog'
import { VISUAL_API } from '../lib/api'
import type { Block, Field } from '../lib/types'

const props = defineProps<{ block: Block }>()

const api = inject(VISUAL_API)!

const campo = (name: string): Field | null => props.block.fields.find(f => f.name === name) ?? null
const ruta = computed(() => campo('ruta'))
const ancho = computed(() => campo('ancho'))

const url = ref<string | null>(null)
const cargando = ref(false)
/** La URL se pidió y no había archivo: se dice, en vez de enseñar un roto. */
const falta = ref(false)

watch(() => ruta.value?.value, async (path) => {
  url.value = null
  falta.value = false
  if (!path) return
  cargando.value = true
  url.value = await api.assetUrl(path)
  cargando.value = false
  falta.value = url.value === null
}, { immediate: true })

/** Anchos que se ofrecen, en fracciones de la caja de texto. */
const ANCHOS = ['0.4', '0.6', '0.8', '1.0']

function setAncho(valor: string) {
  const field = ancho.value
  // Sin `[width=…]` en el LaTeX no hay campo al que apuntar: cambiarlo pediría
  // reescribir la macro entera, y eso ya es abrir la pestaña Código.
  if (!field) return
  api.edit(props.block, field, valor)
}

const reemplazando = ref(false)
const input = useTemplateRef<HTMLInputElement>('input')

async function reemplazar(file: File | null | undefined) {
  if (!file) return
  reemplazando.value = true
  try {
    await api.replaceImage(props.block, file)
  } finally {
    reemplazando.value = false
  }
}
</script>

<template>
  <div class="pl-[15px]">
    <div class="marco">
      <img v-if="url" :src="url" :alt="ruta?.value ?? ''" class="imagen">
      <div v-else class="hueco">
        <template v-if="cargando"><span class="text-xs">Cargando…</span></template>
        <template v-else-if="falta">
          <ImageOff :size="16" />
          <span class="text-xs">Falta <code>{{ ruta?.value }}</code> en el proyecto</span>
        </template>
        <template v-else>
          <ImageOff :size="16" />
          <span class="text-xs">Sin vista previa</span>
        </template>
      </div>
    </div>

    <div class="pie">
      <code class="ruta">{{ ruta?.value }}</code>

      <template v-if="api.canWrite">
        <span class="flabel">Ancho</span>
        <select
          class="ancho"
          :value="ancho?.value ?? FIGURE_WIDTH"
          :disabled="!ancho"
          :title="ancho ? 'Parte del ancho del texto que ocupa' : 'Esta imagen no lleva ancho; cámbialo en la pestaña Código'"
          @change="setAncho(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="valor in ANCHOS" :key="valor" :value="valor">
            {{ Math.round(Number(valor) * 100) }} %
          </option>
        </select>

        <button
          class="icon-btn"
          :disabled="!api.canUpload || reemplazando"
          :title="api.canUpload ? 'Cambiar la imagen' : 'No se pueden subir imágenes aquí'"
          @click="input?.click()"
        >
          <RefreshCw :size="12" :class="reemplazando ? 'opacity-50' : ''" />
        </button>
        <input
          ref="input"
          type="file"
          class="hidden"
          accept="image/png,image/jpeg,application/pdf"
          @change="reemplazar(($event.target as HTMLInputElement).files?.[0])"
        >
      </template>
    </div>
  </div>
</template>

<style scoped>
.marco {
  display: flex;
  justify-content: center;
  padding: 6px;
  border-radius: var(--macvue-ref-radius-5, 5px);
  background: var(--bg-sunken);
}
.imagen {
  max-height: 220px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 3px;
}
.hueco {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 64px;
  color: var(--text-faint);
}

.pie {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}
.ruta {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.flabel {
  font-size: 10.5px;
  color: var(--text-faint);
}
.ancho {
  height: 18px;
  padding: 0 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-ui);
  font-size: 11px;
}
.ancho:hover:not(:disabled) { background: var(--bg-hover); }
</style>
