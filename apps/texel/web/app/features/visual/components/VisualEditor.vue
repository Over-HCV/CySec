<script setup lang="ts">
/**
 * Vista por bloques de un archivo.
 *
 * No tiene documento propio: trabaja sobre el mismo `Y.Text` que el editor de
 * código, así que lo que se toca aquí se ve allí al instante, y al revés. Solo
 * hay un CRDT.
 *
 * Cada bloque de primer nivel es una tarjeta translúcida, no cristal: esta
 * vista vive dentro del panel de cristal del editor, y un `backdrop-filter`
 * anidado solo puede muestrear el relleno de ese panel, nunca el fondo de la
 * ventana — sale gris y plano. Los anidados van transparentes encima.
 */
import { Plus } from 'lucide-vue-next'
import { baseDe } from '~/shared/lib/asset-name'
import type { SupabaseYjsProvider } from '~/features/editor/lib/supabase-yjs-provider'
import { useBlocks } from '../composables/useBlocks'
import { capturaTemplate, insertable } from '../lib/catalog'
import { iconOf } from '../lib/icons'
import { VISUAL_API } from '../lib/api'
import { docKindOf, type Block, type BlockKind } from '../lib/types'

const props = defineProps<{
  provider: SupabaseYjsProvider
  path: string
  canWrite: boolean
  /**
   * Proyecto al que pertenece el archivo. Falta en el banco de pruebas
   * (`/dev/visual`), que trabaja sobre un `Y.Text` en memoria: allí no hay
   * dónde subir una imagen y el bloque se ofrece deshabilitado.
   */
  projectId?: string
}>()

const kind = computed(() => docKindOf(props.path) ?? 'tex')
const ytext = props.provider.doc.getText('content')

const {
  text, blocks, sourceOf, problems, notice, collapsed, caret, placeCaret, toggleCollapse,
  edit, split, editBody, setLanguage, rename, addInside, writeInside, insert, insertAt, convert,
  addRow, deleteRow, shiftRow, remove, duplicate, move, moveTo, toggle, dragging, dropTarget
} = useBlocks(ytext, kind.value)

const { uploadImage, assetUrl, canUpload } = useProjectAssets(() => props.projectId)

/** Los huecos de solo espacios forman parte del documento, pero no se pintan. */
const visible = computed(() => blocks.value.filter(b => !b.flags?.blank))

/**
 * Subir una imagen y meterla en el documento.
 *
 * La macro no se puede plantillar de antemano como los demás bloques: hasta que
 * el archivo no está en `pics/` no hay nombre que escribir dentro. Por eso el
 * menú abre primero el diálogo y solo después inserta, con el LaTeX ya
 * compuesto.
 *
 * Lo que se escribe es `\captura{archivo.png}{pie}`, que es lo que usa el curso:
 * mientras la imagen no esté subida el PDF sale igual, con una caja «captura
 * pendiente», en vez de no compilar. Un `\begin{figure}` escrito a mano se sigue
 * leyendo y editando igual que antes.
 */
type Edge = 'before' | 'after' | 'inside'

/** Dónde irá la imagen que se está subiendo. `block` a `null` es «al final». */
const dialogo = ref<{ block: Block | null, edge: Edge } | null>(null)
const subiendo = ref(false)
const errorSubida = ref('')

function askImage(block: Block | null, edge: Edge) {
  errorSubida.value = ''
  dialogo.value = { block, edge }
}

async function onSubmit(file: File, name: string) {
  const destino = dialogo.value
  if (!destino) return
  subiendo.value = true
  errorSubida.value = ''
  try {
    const { path } = await uploadImage(file, name)
    const latex = capturaTemplate(nombreDe(path))
    if (!destino.block) insert(text.value.length, 'figura', latex)
    else if (destino.edge === 'inside') addInside(destino.block, 'figura', latex)
    else insertAt(destino.block, destino.edge, 'figura', latex)
    dialogo.value = null
  } catch (e) {
    errorSubida.value = (e as Error).message
  } finally {
    subiendo.value = false
  }
}

/**
 * Pegar una imagen: se sube y se coloca sin abrir ningún diálogo.
 *
 * Detrás del párrafo en el que se estaba escribiendo, o dentro del contenedor
 * si lo que tenía el foco era su última línea —pegar en una respuesta vacía es
 * pegar *en* la respuesta—. Nunca en medio de la prosa: en LaTeX una figura es
 * un bloque, no una palabra, y colarla dentro partiría el párrafo en dos.
 */
async function insertImage(target: Block, file: File, where: 'after' | 'inside' = 'after') {
  const { path } = await uploadImage(file)
  const latex = capturaTemplate(nombreDe(path))
  if (where === 'inside') addInside(target, 'figura', latex)
  else insertAt(target, 'after', 'figura', latex)
}

/**
 * Cambiar la imagen de un bloque que ya existe: solo se reescribe la ruta.
 *
 * Un `\captura` lleva dentro el nombre del archivo y un `\includegraphics` la
 * ruta entera, así que lo que se escribe depende de con cuál de los dos se
 * escribió el bloque.
 */
async function replaceImage(block: Block, file: File) {
  const campo = block.fields.find(f => f.name === 'ruta')
  if (!campo) return
  const { path } = await uploadImage(file)
  edit(block, campo, block.meta?.cmd === 'captura' ? nombreDe(path) : path)
}

/**
 * Subir el archivo que le falta a un bloque que ya existe.
 *
 * El nombre no se inventa: se reutiliza el que el bloque ya dice, que es lo que
 * hace que no haya que preguntarlo ni tocar el documento. Solo se reescribe la
 * ruta si el nombre final no es el que había —otra extensión, o un nombre que
 * hubo que sanear—, porque entonces el `\captura` apuntaría a un archivo que no
 * existe.
 */
async function fillImage(block: Block, file: File) {
  const campo = block.fields.find(f => f.name === 'ruta')
  if (!campo) return
  const { path } = await uploadImage(file, baseDe(campo.value))
  const escrito = block.meta?.cmd === 'captura' ? nombreDe(path) : path
  if (escrito !== campo.value) edit(block, campo, escrito)
}

/** `pics/QRT-482.png` → `QRT-482.png`: lo que va dentro de un `\captura`. */
function nombreDe(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

// El árbol es recursivo y sin límite de profundidad: las acciones se inyectan
// una vez en vez de encadenar `emit` de padre en padre.
provide(VISUAL_API, {
  canWrite: props.canWrite,
  doc: kind.value,
  text,
  problems,
  collapsed,
  caret,
  placeCaret,
  toggleCollapse,
  source: sourceOf,
  edit,
  split,
  editBody,
  setLanguage,
  rename,
  addInside,
  insertAt,
  insertAtEnd: (blockKind: BlockKind, template?: string) =>
    insert(text.value.length, blockKind, template),
  askImage,
  convert,
  addRow,
  deleteRow,
  shiftRow,
  writeInside,
  move,
  moveTo,
  dragging,
  dropTarget,
  duplicate,
  remove,
  toggleOption: toggle,
  assetUrl,
  canUpload: canUpload.value,
  insertImage,
  replaceImage,
  fillImage
})

/** El último bloque visible: junto a él está la tira que escribe al final. */
const ultimo = computed(() => visible.value[visible.value.length - 1] ?? null)
</script>

<template>
  <div class="h-full overflow-y-auto px-4 py-3 relative">
    <!-- Una acción llegó tarde y no se escribió nada. Es preferible a escribir
         donde no toca, pero hay que decirlo o parece que la app no responde. -->
    <div
      v-if="notice"
      class="sticky top-0 z-10 mx-auto mb-2 max-w-[820px] rounded-[var(--radius)] px-3 py-1.5
             text-[12px] text-[var(--text)] bg-[var(--accent-soft)] border border-[var(--accent)]"
    >
      {{ notice }}
    </div>

    <div v-if="visible.length === 0" class="text-center text-[var(--text-muted)] text-[12.5px] py-10">
      <p class="m-0 mb-2">El archivo está vacío.</p>
      <!-- Con el archivo vacío no hay bloque junto al que poner la tira, así
           que el menú se enseña abierto: si no, no habría dónde pulsar. -->
      <div v-if="canWrite" class="inline-block">
        <AppMenu prefer="below">
          <template #trigger>
            <Plus :size="12" /> Añadir bloque
          </template>

          <div class="block-menu-grid">
            <AppMenuItem
              v-for="spec in insertable(kind)"
              :key="spec.kind"
              :hint="spec.kind === 'figura' && !canUpload
                ? 'Aquí no: este documento no está dentro de un proyecto'
                : spec.hint"
              :disabled="spec.kind === 'figura' && !canUpload"
              @select="spec.kind === 'figura' ? askImage(null, 'after') : insert(text.length, spec.kind)"
            >
              <template #icon>
                <component :is="iconOf(spec.icon)" :size="12" class="shrink-0 mt-[3px]" />
              </template>
              {{ spec.label }}
            </AppMenuItem>
          </div>
        </AppMenu>
      </div>
    </div>

    <div class="flex flex-col max-w-[820px] mx-auto">
      <template v-for="block in visible" :key="block.id">
        <!-- El hueco de antes de cada bloque: escribir en medio del documento
             es señalar el sitio, no crear abajo y subir a golpe de flecha. -->
        <BlockInsert :doc="kind" :block="block" edge="before" />
        <div class="block-card px-2 py-1.5">
          <BlockNode :block="block" :depth="0" />
        </div>
      </template>

      <!-- Y el del final, que es el que sustituye a la vieja barra «Añadir
           bloque». Prefiere abrirse hacia arriba: está al fondo del scroller. -->
      <BlockInsert v-if="ultimo" :doc="kind" :block="ultimo" edge="after" prefer="above" />

    </div>

    <ImageDrop
      v-if="dialogo"
      :busy="subiendo"
      :error="errorSubida"
      @close="dialogo = null"
      @submit="onSubmit"
    />
  </div>
</template>
