<script setup lang="ts">
/**
 * Entrada bibliográfica. Los campos no salen de un catálogo fijo: son los que
 * tenga la entrada en el archivo, en su orden. En `refs.bib` conviven `@book`,
 * `@online`, `@standard`… cada uno con los suyos.
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

const tipo = computed(() => props.block.fields.find(f => f.name === 'tipo')!)
const clave = computed(() => props.block.fields.find(f => f.name === 'clave')!)
/** El resto: título, autor, año… lo que traiga la entrada. */
const resto = computed(() =>
  props.block.fields.filter(f => f.name !== 'tipo' && f.name !== 'clave'))
</script>

<template>
  <BlockShell
    label="Referencia"
    :badge="`@${tipo.value}`"
    :can-write="canWrite"
    :source="source"
    @move="$emit('move', $event)"
    @duplicate="$emit('duplicate')"
    @remove="$emit('remove')"
  >
    <BlockField
      label="Clave de cita"
      mono
      :value="clave.value"
      :disabled="!canWrite"
      :problem="problems[`${block.id}:clave`]"
      @commit="$emit('edit', clave, $event)"
    />

    <BlockField
      v-for="f in resto"
      :key="f.name"
      :label="f.name"
      :value="f.value"
      :multiline="f.value.length > 70 || f.value.includes('\n')"
      :disabled="!canWrite"
      :problem="problems[`${block.id}:${f.name}`]"
      @commit="$emit('edit', f, $event)"
    />
  </BlockShell>
</template>
