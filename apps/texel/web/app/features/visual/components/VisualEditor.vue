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
import { MacButton } from '@macvue/core'
import { Plus } from 'lucide-vue-next'
import type { SupabaseYjsProvider } from '~/features/editor/lib/supabase-yjs-provider'
import { useBlocks } from '../composables/useBlocks'
import { insertable } from '../lib/catalog'
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
const menuOpen = ref(false)
const opciones = computed(() => insertable(kind.value))

function addAtEnd(blockKind: BlockKind) {
  menuOpen.value = false
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

      <div v-if="canWrite" class="relative self-start mt-1">
        <MacButton size="small" @click="menuOpen = !menuOpen">
          <Plus :size="12" class="inline align-[-2px] mr-1" /> Añadir bloque
        </MacButton>

        <div
          v-if="menuOpen"
          class="glass-menu absolute z-20 mt-1 min-w-[230px] rounded-[var(--radius)] p-1"
        >
          <button
            v-for="spec in opciones"
            :key="spec.kind"
            class="w-full text-left px-2 py-1.5 rounded-[6px] hover:bg-[var(--bg-hover)]"
            @click="addAtEnd(spec.kind)"
          >
            <span class="text-[12.5px]">{{ spec.label }}</span>
            <span class="block text-[11px] text-[var(--text-faint)]">{{ spec.hint }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
