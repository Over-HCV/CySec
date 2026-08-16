<script setup lang="ts">
/**
 * Respuesta. Vacía significa «pendiente»: es exactamente lo que hace el entorno
 * al compilar (`\todoans` deja un warning en el `.log` y una caja naranja en el
 * PDF), así que aquí se dice igual en vez de dejar un hueco mudo.
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

const cuerpo = computed(() => props.block.fields.find(f => f.name === 'cuerpo')!)
const pendiente = computed(() => cuerpo.value.value.trim() === '')
</script>

<template>
  <BlockShell
    label="Respuesta"
    :badge="pendiente ? 'pendiente' : undefined"
    :tone="pendiente ? 'warning' : 'normal'"
    :can-write="canWrite"
    :source="source"
    @move="$emit('move', $event)"
    @duplicate="$emit('duplicate')"
    @remove="$emit('remove')"
  >
    <BlockField
      label="Respuesta"
      :value="cuerpo.value"
      multiline
      :placeholder="canWrite ? 'Escribe aquí la respuesta…' : ''"
      :disabled="!canWrite"
      :problem="problems[`${block.id}:cuerpo`]"
      @commit="$emit('edit', cuerpo, $event)"
    />
  </BlockShell>
</template>
