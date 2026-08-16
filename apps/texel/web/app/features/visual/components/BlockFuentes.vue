<script setup lang="ts">
/**
 * Lista de fuentes. Cada `\fuente{url}` es una fila; lo que haya entre medias
 * que no sea una fuente (en `ws-01` hay un `\item` suelto) se muestra como
 * LaTeX crudo en vez de desaparecer.
 */
import { Plus, Trash2 } from 'lucide-vue-next'
import type { Block, Field } from '../lib/types'

const props = defineProps<{
  block: Block
  canWrite: boolean
  source: string
  text: string
  problems: Record<string, string>
}>()

const emit = defineEmits<{
  edit: [Field, string]
  addItem: [number]
  removeItem: [Block]
  move: [-1 | 1]
  duplicate: []
  remove: []
}>()

/** Hijos que se pintan: los huecos de solo espacios no aportan nada. */
const items = computed(() => (props.block.items ?? []).filter(b => !b.flags?.blank))

/** Un `raw` hijo se edita como texto: su campo es su propio rango. */
function rawField(item: Block): Field {
  const value = props.text.slice(item.span.from, item.span.to)
  return { name: 'raw', span: item.span, value }
}

/** Se añade justo antes del `\end{fuentes}`. */
function appendAt(): number {
  const last = props.block.items?.[props.block.items.length - 1]
  return last ? last.span.to : props.block.span.to
}
</script>

<template>
  <BlockShell
    label="Fuentes"
    :can-write="canWrite"
    :source="source"
    @move="$emit('move', $event)"
    @duplicate="$emit('duplicate')"
    @remove="$emit('remove')"
  >
    <div v-for="item in items" :key="item.id" class="flex items-end gap-1.5">
      <BlockField
        v-if="item.kind === 'fuente'"
        class="flex-1"
        label="URL"
        :value="item.fields[0]!.value"
        placeholder="https://…"
        :disabled="!canWrite"
        :problem="problems[`${item.id}:url`]"
        @commit="emit('edit', item.fields[0]!, $event)"
      />
      <BlockField
        v-else
        class="flex-1"
        label="LaTeX"
        mono
        :value="rawField(item).value"
        :disabled="!canWrite"
        multiline
        @commit="emit('edit', rawField(item), $event)"
      />
      <button v-if="canWrite" class="icon-btn mb-1" title="Quitar" @click="emit('removeItem', item)">
        <Trash2 :size="13" />
      </button>
    </div>

    <button
      v-if="canWrite"
      class="btn self-start text-[12px] py-1"
      @click="emit('addItem', appendAt())"
    >
      <Plus :size="12" class="mr-1 inline align-[-2px]" /> Añadir fuente
    </button>
  </BlockShell>
</template>
