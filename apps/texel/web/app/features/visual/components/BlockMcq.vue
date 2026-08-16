<script setup lang="ts">
/**
 * Selección múltiple. Marcar una opción es cambiar `\opcion` por `\opcion*`:
 * un solo carácter en el documento, no una reescritura del bloque.
 */
import { Check, Plus, Trash2 } from 'lucide-vue-next'
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
  toggle: [Block]
  addItem: [number]
  removeItem: [Block]
  move: [-1 | 1]
  duplicate: []
  remove: []
}>()

const enunciado = computed(() => props.block.fields.find(f => f.name === 'enunciado')!)
const items = computed(() => (props.block.items ?? []).filter(b => !b.flags?.blank))
const sinMarcar = computed(() =>
  items.value.filter(b => b.kind === 'opcion').every(b => !b.flags?.correcta))

function rawField(item: Block): Field {
  return { name: 'raw', span: item.span, value: props.text.slice(item.span.from, item.span.to) }
}

function appendAt(): number {
  const last = props.block.items?.[props.block.items.length - 1]
  return last ? last.span.to : props.block.span.to
}
</script>

<template>
  <BlockShell
    label="Selección múltiple"
    :badge="sinMarcar ? 'sin marcar' : undefined"
    :tone="sinMarcar ? 'warning' : 'normal'"
    :can-write="canWrite"
    :source="source"
    @move="$emit('move', $event)"
    @duplicate="$emit('duplicate')"
    @remove="$emit('remove')"
  >
    <BlockField
      label="Enunciado"
      multiline
      :value="enunciado.value"
      :disabled="!canWrite"
      :problem="problems[`${block.id}:enunciado`]"
      @commit="emit('edit', enunciado, $event)"
    />

    <div v-for="item in items" :key="item.id" class="flex items-end gap-1.5">
      <template v-if="item.kind === 'opcion'">
        <button
          class="mark mb-1"
          :class="{ 'mark-on': item.flags?.correcta }"
          :disabled="!canWrite"
          :title="item.flags?.correcta ? 'Desmarcar como correcta' : 'Marcar como correcta'"
          @click="emit('toggle', item)"
        >
          <Check v-if="item.flags?.correcta" :size="12" />
        </button>
        <BlockField
          class="flex-1"
          label="Opción"
          multiline
          :value="item.fields[0]!.value"
          :disabled="!canWrite"
          :problem="problems[`${item.id}:texto`]"
          @commit="emit('edit', item.fields[0]!, $event)"
        />
      </template>
      <BlockField
        v-else
        class="flex-1"
        label="LaTeX"
        mono
        multiline
        :value="rawField(item).value"
        :disabled="!canWrite"
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
      <Plus :size="12" class="mr-1 inline align-[-2px]" /> Añadir opción
    </button>
  </BlockShell>
</template>

<style scoped>
.mark {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-strong);
  border-radius: 5px;
  background: var(--bg-raised);
  color: white;
  flex: 0 0 auto;
}
.mark-on {
  background: var(--success);
  border-color: var(--success);
}
.mark:disabled { opacity: 0.5; }
</style>
