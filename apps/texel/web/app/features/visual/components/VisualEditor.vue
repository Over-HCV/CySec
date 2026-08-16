<script setup lang="ts">
/**
 * Vista por bloques de un archivo.
 *
 * No tiene documento propio: trabaja sobre el mismo `Y.Text` que el editor de
 * código, así que lo que se toca aquí se ve allí al instante, y al revés. Solo
 * hay un CRDT.
 */
import { Plus } from 'lucide-vue-next'
import type { SupabaseYjsProvider } from '~/features/editor/lib/supabase-yjs-provider'
import { useBlocks } from '../composables/useBlocks'
import { insertable } from '../lib/catalog'
import { docKindOf, type Block, type BlockKind, type Field } from '../lib/types'
import BlockBibEntry from './BlockBibEntry.vue'
import BlockFuentes from './BlockFuentes.vue'
import BlockGeneric from './BlockGeneric.vue'
import BlockMcq from './BlockMcq.vue'
import BlockRaw from './BlockRaw.vue'
import BlockRespuesta from './BlockRespuesta.vue'

const props = defineProps<{
  provider: SupabaseYjsProvider
  path: string
  canWrite: boolean
}>()

const kind = computed(() => docKindOf(props.path) ?? 'tex')
const ytext = props.provider.doc.getText('content')

const {
  text, blocks, sourceOf, edit, problems,
  insert, remove, duplicate, move, toggle
} = useBlocks(ytext, kind.value)

/** Los huecos de solo espacios forman parte del documento, pero no se pintan. */
const visible = computed(() => blocks.value.filter(b => !b.flags?.blank))

/** Qué componente representa cada tipo. */
function componentFor(block: Block) {
  switch (block.kind) {
    case 'bibEntry': return BlockBibEntry
    case 'fuentes': return BlockFuentes
    case 'mcq': return BlockMcq
    case 'respuesta': return BlockRespuesta
    case 'raw': return BlockRaw
    default: return BlockGeneric
  }
}

/** Índice real dentro de `blocks`, que es lo que entiende `move`. */
function indexOf(block: Block): number {
  return blocks.value.indexOf(block)
}

function onEdit(block: Block, field: Field, value: string) {
  edit(block, field, value)
}

/** Añadir al final del documento desde la barra inferior. */
const menuOpen = ref(false)
const opciones = computed(() => insertable(kind.value))

function addAtEnd(blockKind: BlockKind) {
  menuOpen.value = false
  insert(text.value.length, blockKind)
}

/** Añadir un hijo (fuente u opción) en la posición que pida el bloque. */
function addItem(parent: Block, at: number) {
  insert(at, parent.kind === 'fuentes' ? 'fuente' : 'opcion')
}
</script>

<template>
  <div class="h-full overflow-y-auto px-4 py-3">
    <div v-if="visible.length === 0" class="text-center text-[var(--text-muted)] text-[12.5px] py-10">
      El archivo está vacío. Añade un bloque para empezar.
    </div>

    <div class="flex flex-col gap-2.5 max-w-[760px] mx-auto">
      <component
        :is="componentFor(block)"
        v-for="block in visible"
        :key="block.id"
        :block="block"
        :can-write="canWrite"
        :source="sourceOf(block)"
        :text="text"
        :problems="problems"
        @edit="(field: Field, value: string) => onEdit(block, field, value)"
        @toggle="toggle"
        @add-item="(at: number) => addItem(block, at)"
        @remove-item="remove"
        @move="(dir: -1 | 1) => move(indexOf(block), dir)"
        @duplicate="duplicate(block)"
        @remove="remove(block)"
      />

      <div v-if="canWrite" class="relative self-start mt-1">
        <button class="btn text-[12px] py-1" @click="menuOpen = !menuOpen">
          <Plus :size="12" class="mr-1 inline align-[-2px]" /> Añadir bloque
        </button>

        <div
          v-if="menuOpen"
          class="glass-menu absolute z-20 mt-1 min-w-[220px] rounded-[var(--radius)] p-1"
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
