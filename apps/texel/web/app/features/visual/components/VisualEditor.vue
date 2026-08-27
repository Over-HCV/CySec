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
import { insertable } from '../lib/catalog'
import { iconOf } from '../lib/icons'
import { VISUAL_API } from '../lib/api'
import { docKindOf, type BlockKind } from '../lib/types'

const props = defineProps<{
  provider: SupabaseYjsProvider
  path: string
  canWrite: boolean
}>()

const kind = computed(() => docKindOf(props.path) ?? 'tex')
const ytext = props.provider.doc.getText('content')

const {
  text, blocks, sourceOf, problems, notice, collapsed, caret, placeCaret, toggleCollapse,
  edit, split, editBody, rename, addInside, writeInside, insert, remove, duplicate, move, toggle
} = useBlocks(ytext, kind.value)

/** Los huecos de solo espacios forman parte del documento, pero no se pintan. */
const visible = computed(() => blocks.value.filter(b => !b.flags?.blank))

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
  duplicate,
  remove,
  toggleOption: toggle
})

/** Añadir al final del documento desde la barra inferior. */
const opciones = computed(() => insertable(kind.value))

function addAtEnd(blockKind: BlockKind) {
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
              :hint="spec.hint"
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
  </div>
</template>
