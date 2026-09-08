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
import { ImageOff, ImagePlus, RefreshCw } from 'lucide-vue-next'
import { esTipoAceptado, PICS_DIR, TIPOS_ACEPTADOS } from '~/shared/lib/asset-name'
import { FIGURE_WIDTH } from '../lib/catalog'
import { VISUAL_API } from '../lib/api'
import type { Block, Field } from '../lib/types'

const props = defineProps<{ block: Block }>()

const api = inject(VISUAL_API)!

const campo = (name: string): Field | null => props.block.fields.find(f => f.name === name) ?? null
const ruta = computed(() => campo('ruta'))
const ancho = computed(() => campo('ancho'))

/**
 * `\captura{archivo.png}{pie}` lleva el `pics/` por dentro (lo pone la clase,
 * ver `latex/tex/common/boxes.tex`), así que en el documento solo está el
 * nombre. Para pedir la miniatura hace falta la ruta entera, que es la que
 * guarda `files.path`.
 */
const esCaptura = computed(() => props.block.meta?.cmd === 'captura')
const archivo = computed(() => {
  const valor = ruta.value?.value
  if (!valor) return null
  return esCaptura.value ? `${PICS_DIR}/${valor}` : valor
})

const url = ref<string | null>(null)
const cargando = ref(false)
/** La URL se pidió y no había archivo: se dice, en vez de enseñar un roto. */
const falta = ref(false)

watch(archivo, async (path) => {
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

/**
 * Poner el archivo, por las tres vías de siempre: soltarlo, buscarlo o pegarlo.
 *
 * Cuando el archivo **falta**, el hueco deja de ser un cartel y pasa a ser la
 * zona donde se suelta: el bloque ya dice cómo se llama la imagen, así que no
 * hay nada que preguntar —ni nombre ni sitio—, solo el archivo. Lo mismo sirve
 * para cambiar una que ya está, y por eso hay un solo `<input>` con un modo.
 */
const reemplazando = ref(false)
const error = ref('')
const sobre = ref(false)
const modo = ref<'rellenar' | 'reemplazar'>('rellenar')
const input = useTemplateRef<HTMLInputElement>('input')

function pedir(cual: 'rellenar' | 'reemplazar') {
  modo.value = cual
  error.value = ''
  input.value?.click()
}

async function reemplazar(file: File | null | undefined) {
  if (!file || reemplazando.value) return
  if (!esTipoAceptado(file.type)) {
    error.value = 'Solo PNG, JPG o PDF: son los que el compilador sabe poner en el documento.'
    return
  }
  reemplazando.value = true
  error.value = ''
  try {
    if (modo.value === 'rellenar') await api.fillImage(props.block, file)
    else await api.replaceImage(props.block, file)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    reemplazando.value = false
  }
}

/** ¿Se puede poner aquí el archivo que falta? */
const sePuedeSubir = computed(() => api.canWrite && api.canUpload)

function soltar(event: DragEvent) {
  sobre.value = false
  modo.value = 'rellenar'
  void reemplazar(event.dataTransfer?.files?.[0])
}

/** Pegar con ⌘V: una captura recién hecha vive en el portapapeles y en ningún archivo. */
function pegar(event: ClipboardEvent) {
  const pegado = event.clipboardData?.files?.[0]
  if (!pegado) return
  event.preventDefault()
  modo.value = 'rellenar'
  void reemplazar(pegado)
}
</script>

<template>
  <div class="pl-[15px]">
    <div class="marco">
      <img v-if="url" :src="url" :alt="archivo ?? ''" class="imagen">
      <div v-else-if="cargando" class="hueco"><span class="text-xs">Cargando…</span></div>

      <!-- El archivo no está: aquí mismo se pone. El nombre ya lo dice el
           bloque, así que no hay nada más que preguntar. -->
      <button v-else-if="falta && sePuedeSubir" class="zona" :class="{ 'zona-sobre': sobre }" :disabled="reemplazando"
        @click="pedir('rellenar')" @dragover.prevent="sobre = true" @dragleave="sobre = false" @drop.prevent="soltar"
        @paste="pegar">
        <ImagePlus :size="16" />
        <span v-if="reemplazando" class="text-xs">Subiendo…</span>
        <span v-else class="text-xs">
          Falta <code>{{ archivo }}</code>
          <br />
          Suéltala aquí, pégala con ⌘V o haz clic para buscarla
        </span>
      </button>

      <div v-else class="hueco">
        <ImageOff :size="16" />
        <span v-if="falta" class="text-xs">Falta <code>{{ archivo }}</code> en el proyecto</span>
        <span v-else class="text-xs">Sin vista previa</span>
      </div>
    </div>

    <div class="pie">
      <code class="ruta">{{ archivo }}</code>

      <template v-if="api.canWrite">
        <span class="flabel">Ancho</span>
        <select class="ancho" :value="ancho?.value ?? FIGURE_WIDTH" :disabled="!ancho" :title="ancho ? 'Parte del ancho del texto que ocupa'
          : esCaptura ? 'Una captura ocupa el 80 % que le fija la clase'
            : 'Esta imagen no lleva ancho; cámbialo en la pestaña Código'"
          @change="setAncho(($event.target as HTMLSelectElement).value)">
          <option v-for="valor in ANCHOS" :key="valor" :value="valor">
            {{ Math.round(Number(valor) * 100) }} %
          </option>
        </select>

        <button class="icon-btn" :disabled="!api.canUpload || reemplazando"
          :title="api.canUpload ? 'Cambiar la imagen' : 'No se pueden subir imágenes aquí'"
          @click="pedir('reemplazar')">
          <RefreshCw :size="12" :class="reemplazando ? 'opacity-50' : ''" />
        </button>
        <input ref="input" type="file" class="hidden" :accept="TIPOS_ACEPTADOS"
          @change="reemplazar(($event.target as HTMLInputElement).files?.[0])">
      </template>
    </div>

    <p v-if="error" class="m-0 mt-1 text-[11px] text-[var(--danger)]">{{ error }}</p>
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

/* El hueco de una imagen que falta es la zona donde se suelta el archivo: el
   mismo aspecto del diálogo de subida, para que se lea como lo que es. */
.zona {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 64px;
  padding: 10px;
  border: 1px dashed var(--macvue-material-glass-regular-rim, var(--border));
  border-radius: var(--macvue-ref-radius-5, 5px);
  background: transparent;
  color: var(--text-faint);
  text-align: center;
  cursor: pointer;
}

.zona:hover:not(:disabled),
.zona-sobre {
  border-color: var(--accent);
  color: var(--text-muted);
}

.zona:disabled {
  cursor: default;
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

.ancho:hover:not(:disabled) {
  background: var(--bg-hover);
}
</style>
