<script setup lang="ts">
/**
 * Vista por bloques de un archivo.
 *
 * No tiene documento propio: trabaja sobre el mismo `Y.Text` que el editor de
 * código, así que lo que se toca aquí se ve allí al instante, y al revés. Solo
 * hay un CRDT.
 *
 * Cada bloque de primer nivel es una lámina de cristal; los anidados van
 * transparentes encima. Apilar `backdrop-filter` en cada nivel cuesta caro y
 * emborrona el texto de dentro.
 */
import { MacButton, MacGlassPanel } from '@macvue/core'
import { Plus } from 'lucide-vue-next'
import type { SupabaseYjsProvider } from '~/features/editor/lib/supabase-yjs-provider'
import { useBlocks } from '../composables/useBlocks'
import { insertable } from '../lib/catalog'
import { VISUAL_API } from '../lib/api'
import { docKindOf, type Block, type BlockKind } from '../lib/types'

const props = defineProps<{
  provider: SupabaseYjsProvider
  path: string
  canWrite: boolean
}>()

const kind = computed(() => docKindOf(props.path) ?? 'tex')
const ytext = props.provider.doc.getText('content')

const {
  text, blocks, sourceOf, problems, collapsed, toggleCollapse,
  edit, editBody, rename, addInside, insert, remove, duplicate, move, toggle
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
  toggleCollapse,
  source: sourceOf,
  edit,
  editBody,
  rename,
  addInside,
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
  <div class="h-full overflow-y-auto px-4 py-3" data-macvue-glass="on">
    <div v-if="visible.length === 0" class="text-center text-[var(--text-muted)] text-[12.5px] py-10">
      El archivo está vacío. Añade un bloque para empezar.
    </div>

    <div class="flex flex-col gap-1.5 max-w-[820px] mx-auto">
      <MacGlassPanel
        v-for="block in visible"
        :key="block.id"
        material="regular"
        class="px-2 py-1.5"
      >
        <BlockNode :block="block" :siblings="blocks" :depth="0" />
      </MacGlassPanel>

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
