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
import { Crop as CropIcon, ImageOff, ImagePlus, RefreshCw } from 'lucide-vue-next'
import { esTipoAceptado, PICS_DIR, TIPOS_ACEPTADOS } from '~/shared/lib/asset-name'
import { FIGURE_WIDTH } from '../lib/catalog'
import { isFullCrop, parseCrop, thumbBox, thumbStyle, type Crop } from '../lib/crop'
import ImageCrop from './ImageCrop.vue'
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

/**
 * El recorte, si lo hay.
 *
 * Vive en el `trim={…}` del LaTeX, así que se lee del documento como cualquier
 * otro campo y la imagen de `pics/` sigue entera: la miniatura la recorta el
 * CSS y el PDF lo recorta `graphicx`, cada uno a su manera y ninguno tocando el
 * archivo. Un `trim` escrito a mano en centímetros no se sabe mover y sale como
 * «sin recorte»: mejor eso que enseñar un rectángulo en el sitio equivocado.
 */
const recorte = computed<Crop | null>(() => {
  const valor = campo('recorte')?.value
  return valor ? parseCrop(valor) : null
})

/** Tamaño natural de la imagen; hace falta para reservarle el sitio ya recortada. */
const natural = ref({ width: 0, height: 0 })
function medir(event: Event) {
  const img = event.target as HTMLImageElement
  natural.value = { width: img.naturalWidth, height: img.naturalHeight }
}

/** Alto máximo de la miniatura; el mismo que tiene una imagen sin recortar. */
const ALTO_MAX = 220

/**
 * La miniatura recortada: una ventana que tapa y, dentro, la imagen entera
 * agrandada y corrida. La ventana necesita un tamaño calculado porque lo que
 * lleva dentro está fuera del flujo, y ese tamaño sale del natural de la imagen,
 * que hasta que no carga no se sabe: mientras tanto se pinta sin recortar.
 */
const estiloVentana = computed(() =>
  recorte.value ? thumbBox(recorte.value, natural.value, ALTO_MAX) : null)
const estiloImagen = computed(() => recorte.value ? thumbStyle(recorte.value) : null)

const recortando = ref(false)
/**
 * El aviso de que la clase del proyecto se queda corta, que solo sale cuando
 * alguien intenta recortar: enseñarlo en todas las imágenes de un proyecto
 * viejo sería ruido en cada bloque para algo que a lo mejor nadie quiere.
 */
const avisoClase = ref(false)

/** ¿Se puede recortar? Hace falta imagen y una clase que entienda el `trim`. */
const sePuedeRecortar = computed(() => api.canWrite && api.canCrop.value && url.value !== null)

function tituloRecorte(): string {
  if (!url.value) return 'No hay imagen que recortar'
  if (!api.canCrop.value) {
    return api.classUpdatable.value
      ? 'La clase de este proyecto es anterior al recorte'
      : 'Este proyecto no tiene la clase del curso, así que no se puede recortar'
  }
  return isFullCrop(recorte.value) ? 'Recortar' : 'Cambiar el recorte'
}

/** El botón de recortar: o abre el diálogo, o explica por qué todavía no puede. */
function pedirRecorte() {
  if (sePuedeRecortar.value) { recortando.value = true; return }
  avisoClase.value = api.classUpdatable.value
}

function aplicarRecorte(crop: Crop | null) {
  api.setCrop(props.block, crop)
  recortando.value = false
}

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

/**
 * Poner al día la clase del proyecto para poder recortar.
 *
 * Solo se ofrece cuando la comprobación dice que se queda corta, y reescribe
 * únicamente `tex/common/preamble.tex` y `tex/common/boxes.tex`: son archivos
 * del proyecto y alguien pudo haberlos retocado, así que nadie los toca a sus
 * espaldas.
 */
const actualizandoClase = ref(false)
async function actualizarClase() {
  actualizandoClase.value = true
  error.value = ''
  try {
    await api.updateClass()
    avisoClase.value = false
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    actualizandoClase.value = false
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
      <!-- Con recorte la imagen va dentro de una ventana que la tapa por los
           lados; sin él se pinta tal cual. La de dentro es siempre la original:
           recortar no consume nada, se puede deshacer y volver a hacer. -->
      <div v-if="url && estiloVentana" class="ventana" :style="estiloVentana"
        :title="api.canWrite ? 'Doble clic para cambiar el recorte' : undefined"
        @dblclick="sePuedeRecortar && (recortando = true)">
        <img :src="url" :alt="archivo ?? ''" class="dentro" :style="estiloImagen ?? undefined"
          @load="medir">
      </div>
      <img v-else-if="url" :src="url" :alt="archivo ?? ''" class="imagen"
        :title="api.canWrite ? 'Doble clic para recortar' : undefined"
        @load="medir" @dblclick="sePuedeRecortar && (recortando = true)">
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

        <button class="icon-btn" :class="{ 'text-[var(--accent)]': recorte }"
          :disabled="!url || (!api.canCrop.value && !api.classUpdatable.value)"
          :title="tituloRecorte()" @click="pedirRecorte">
          <CropIcon :size="12" />
        </button>

        <button class="icon-btn" :disabled="!api.canUpload || reemplazando"
          :title="api.canUpload ? 'Cambiar la imagen' : 'No se pueden subir imágenes aquí'"
          @click="pedir('reemplazar')">
          <RefreshCw :size="12" :class="reemplazando ? 'opacity-50' : ''" />
        </button>
        <input ref="input" type="file" class="hidden" :accept="TIPOS_ACEPTADOS"
          @change="reemplazar(($event.target as HTMLInputElement).files?.[0])">
      </template>
    </div>

    <!-- La clase del proyecto es anterior al recorte: se dice y se arregla de
         un clic, en vez de dejar el botón muerto sin explicación. -->
    <p v-if="avisoClase" class="aviso">
      Para recortar hace falta poner al día la clase del proyecto
      (<code>tex/common/preamble.tex</code> y <code>tex/common/boxes.tex</code>).
      <button class="enlace" :disabled="actualizandoClase" @click="actualizarClase">
        {{ actualizandoClase ? 'Actualizando…' : 'Actualizarla' }}
      </button>
      <button class="enlace ml-2" @click="avisoClase = false">Ahora no</button>
    </p>

    <p v-if="error" class="m-0 mt-1 text-[11px] text-[var(--danger)]">{{ error }}</p>

    <ImageCrop v-if="recortando && url" :src="url" :crop="recorte" :nombre="archivo ?? ''"
      @apply="aplicarRecorte" @close="recortando = false" />
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

/* Recortar en la miniatura es tapar, no cortar: la ventana esconde lo que sobra
   y dentro sigue estando la imagen entera, agrandada y corrida. Es lo mismo que
   hace `trim`+`clip` en el PDF, y por eso las dos vistas coinciden. */
.ventana {
  position: relative;
  max-width: 100%;
  border-radius: 3px;
  overflow: hidden;
}

.dentro {
  position: absolute;
  max-width: none;
}

.aviso {
  margin: 3px 0 0;
  font-size: 11px;
  color: var(--text-faint);
}

.enlace {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent);
  font: inherit;
  cursor: pointer;
}

.enlace:disabled {
  color: var(--text-faint);
  cursor: default;
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
