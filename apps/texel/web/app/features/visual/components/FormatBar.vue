<script setup lang="ts">
/**
 * Barra de formato del panel visual: negrita, cursiva, código.
 *
 * Fija arriba y siempre a la vista: quien no sabe LaTeX no va a descubrir que
 * `\textbf{…}` existe, pero sí sabe que la **N** pone algo en negrita.
 *
 * `mousedown.prevent` en cada botón es lo que hace que esto funcione: sin él, el
 * navegador quita el foco del texto antes del clic y no habría nada que marcar.
 */
import { Bold, Italic, Code2, RemoveFormatting } from 'lucide-vue-next'
import { useFormatting, type FormatCommand } from '../composables/useFormatting'

const { available, active, apply } = useFormatting()

const BOTONES: { command: FormatCommand, icon: unknown, title: string }[] = [
  { command: 'bold', icon: Bold, title: 'Negrita (⌘B)' },
  { command: 'italic', icon: Italic, title: 'Cursiva (⌘I)' },
  { command: 'code', icon: Code2, title: 'Código (⌘E)' },
  { command: 'clear', icon: RemoveFormatting, title: 'Quitar formato' }
]
</script>

<template>
  <div class="flex items-center gap-0.5" role="toolbar" aria-label="Formato">
    <button
      v-for="boton in BOTONES"
      :key="boton.command"
      class="icon-btn"
      :class="{ 'is-on': active.includes(boton.command) }"
      :disabled="!available"
      :title="available ? boton.title : 'Pon el cursor en un texto para dar formato'"
      @mousedown.prevent
      @click="apply(boton.command)"
    >
      <component :is="boton.icon" :size="13" />
    </button>
  </div>
</template>

<style scoped>
.is-on {
  background: var(--accent-soft);
  color: var(--accent);
}
</style>
