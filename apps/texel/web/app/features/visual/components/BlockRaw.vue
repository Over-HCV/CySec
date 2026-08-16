<script setup lang="ts">
/**
 * Todo lo que el editor visual no sabe representar: preámbulo, tablas,
 * comentarios, prosa suelta. Se edita como texto y se guarda tal cual, que es
 * la promesa de «nada se pierde».
 */
import type { Block, Field } from '../lib/types'

const props = defineProps<{
  block: Block
  canWrite: boolean
  source: string
  problems: Record<string, string>
}>()

defineEmits<{
  edit: [Field, string]
  move: [-1 | 1]
  duplicate: []
  remove: []
}>()

/** El bloque entero es su propio campo. */
const campo = computed<Field>(() => ({
  name: 'raw',
  span: props.block.span,
  value: props.source
}))
</script>

<template>
  <BlockShell
    label="LaTeX"
    tone="muted"
    :can-write="canWrite"
    :source="source"
    @move="$emit('move', $event)"
    @duplicate="$emit('duplicate')"
    @remove="$emit('remove')"
  >
    <BlockField
      label="Fuente"
      mono
      multiline
      :value="campo.value"
      :disabled="!canWrite"
      :problem="problems[`${block.id}:raw`]"
      @commit="$emit('edit', campo, $event)"
    />
  </BlockShell>
</template>
