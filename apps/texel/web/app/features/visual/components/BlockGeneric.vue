<script setup lang="ts">
/**
 * Bloque de formulario simple: tantos campos como diga el catálogo.
 * Cubre sección, caso, pregunta, nota de borrador y archivo incluido.
 */
import { specOf } from '../lib/catalog'
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

const spec = computed(() => specOf(props.block.kind))

/** Etiqueta con el nivel real cuando es una sección. */
const label = computed(() => {
  if (props.block.kind !== 'section') return spec.value.label
  const nivel = Number(props.block.meta?.nivel ?? 1)
  return nivel === 1 ? 'Sección' : nivel === 2 ? 'Subsección' : 'Apartado'
})

const badge = computed(() =>
  props.block.flags?.starred ? 'sin numerar' : undefined)

function fieldOf(name: string): Field | undefined {
  return props.block.fields.find(f => f.name === name)
}
</script>

<template>
  <BlockShell
    :label="label"
    :badge="badge"
    :can-write="canWrite"
    :source="source"
    @move="$emit('move', $event)"
    @duplicate="$emit('duplicate')"
    @remove="$emit('remove')"
  >
    <template v-for="fs in spec.fields" :key="fs.name">
      <BlockField
        v-if="fieldOf(fs.name)"
        :label="fs.label"
        :value="fieldOf(fs.name)!.value"
        :multiline="fs.multiline"
        :placeholder="fs.placeholder"
        :disabled="!canWrite"
        :problem="problems[`${block.id}:${fs.name}`]"
        @commit="$emit('edit', fieldOf(fs.name)!, $event)"
      />
    </template>
  </BlockShell>
</template>
