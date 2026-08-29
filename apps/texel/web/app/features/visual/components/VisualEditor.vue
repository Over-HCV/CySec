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
import type { SupabaseYjsProvider } from '~/features/editor/lib/supabase-yjs-provider'
import { useBlocks } from '../composables/useBlocks'
import { figureTemplate, insertable } from '../lib/catalog'
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
  edit, split, editBody, rename, addInside, writeInside, insert, insertAfter, remove,
  duplicate, move, moveTo, toggle, dragging, dropTarget
} = useBlocks(ytext, kind.value)

const { uploadImage, assetUrl, canUpload } = useProjectAssets(() => props.projectId)

/** Los huecos de solo espacios forman parte del documento, pero no se pintan. */
const visible = computed(() => blocks.value.filter(b => !b.flags?.blank))

/**
 * Subir una imagen y meterla en el documento.
 *
 * El `figure` no se puede plantillar de antemano como los demás bloques: hasta
 * que el archivo no está en `pics/` no hay ruta que escribir dentro. Por eso el
 * menú abre primero el diálogo y solo después inserta, con el LaTeX ya
 * compuesto.
 */
const dialogo = ref<{ at: number } | null>(null)
const subiendo = ref(false)
const errorSubida = ref('')

function pedirImagen(at: number) {
  errorSubida.value = ''
  dialogo.value = { at }
}

async function onSubmit(file: File, name: string) {
  if (!dialogo.value) return
  subiendo.value = true
  errorSubida.value = ''
  try {
    const { path, name: base } = await uploadImage(file, name)
    insert(dialogo.value.at, 'figura', figureTemplate(path, base))
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
  const { path, name } = await uploadImage(file)
  const latex = figureTemplate(path, name)
  if (where === 'inside') addInside(target, 'figura', latex)
  else insertAfter(target, 'figura', latex)
}

/** Cambiar la imagen de un bloque que ya existe: solo se reescribe la ruta. */
async function replaceImage(block: Block, file: File) {
  const campo = block.fields.find(f => f.name === 'ruta')
  if (!campo) return
  const { path } = await uploadImage(file)
  edit(block, campo, path)
}

// El árbol es recursivo y sin límite de profundidad: las acciones se inyectan
// una vez en vez de encadenar `emit` de padre en padre.
provide(VISUAL_API, {
  canWrite: props.canWrite,
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
  rename,
  addInside,
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
  replaceImage
})

/** Añadir al final del documento desde la barra inferior. */
const opciones = computed(() => insertable(kind.value))

function addAtEnd(blockKind: BlockKind) {
  if (blockKind === 'figura') { pedirImagen(text.value.length); return }
  insert(text.value.length, blockKind)
}
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
      El archivo está vacío. Añade un bloque para empezar.
    </div>

    <div class="flex flex-col gap-1.5 max-w-[820px] mx-auto">
      <div
        v-for="block in visible"
        :key="block.id"
        class="block-card px-2 py-1.5"
      >
        <BlockNode :block="block" :depth="0" />
      </div>

      <!-- `AppMenu` y no un `div` absoluto: el botón está al final del
           documento, dentro del scroller de arriba, así que un menú en el flujo
           nace fuera de la pantalla. Este se teleporta a `body`, se coloca
           `fixed` y prefiere abrirse hacia arriba. El envoltorio lleva la
           posición porque `AppMenu` tiene dos raíces y no hereda atributos. -->
      <div v-if="canWrite" class="self-start mt-1">
        <AppMenu prefer="above">
          <template #trigger>
            <Plus :size="12" /> Añadir bloque
          </template>

          <div class="block-menu-grid">
            <AppMenuItem
              v-for="spec in opciones"
              :key="spec.kind"
              :hint="spec.kind === 'figura' && !canUpload
                ? 'Aquí no: este documento no está dentro de un proyecto'
                : spec.hint"
              :disabled="spec.kind === 'figura' && !canUpload"
              @select="addAtEnd(spec.kind)"
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

    <ImageDrop
      v-if="dialogo"
      :busy="subiendo"
      :error="errorSubida"
      @close="dialogo = null"
      @submit="onSubmit"
    />
  </div>
</template>
