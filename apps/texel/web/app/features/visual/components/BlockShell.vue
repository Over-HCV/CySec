<script setup lang="ts">
/**
 * Marco común de todos los bloques: etiqueta, acciones al pasar el ratón y el
 * popover de «ver LaTeX», que es la escapatoria cuando el bloque no representa
 * bien lo que hay debajo.
 */
import { ChevronUp, ChevronDown, Copy, Trash2, Code2 } from 'lucide-vue-next'

defineProps<{
  label: string
  canWrite: boolean
  /** Fuente exacta del bloque; se enseña tal cual. */
  source: string
  /** Aviso discreto en la cabecera (p. ej. «pendiente»). */
  badge?: string
  tone?: 'normal' | 'warning' | 'muted'
}>()

const emit = defineEmits<{
  move: [-1 | 1]
  duplicate: []
  remove: []
}>()

const showSource = ref(false)
</script>

<template>
  <section
    class="group relative rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-2.5"
    :class="{
      'border-l-2 border-l-[var(--warning)]': tone === 'warning',
      'opacity-80': tone === 'muted'
    }"
  >
    <header class="flex items-center gap-2 mb-1.5">
      <span class="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {{ label }}
      </span>
      <span v-if="badge" class="chip">{{ badge }}</span>

      <span class="flex-1" />

      <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button class="icon-btn" title="Ver LaTeX" @click="showSource = !showSource">
          <Code2 :size="13" :class="showSource ? 'text-[var(--accent)]' : ''" />
        </button>
        <template v-if="canWrite">
          <button class="icon-btn" title="Subir" @click="emit('move', -1)">
            <ChevronUp :size="13" />
          </button>
          <button class="icon-btn" title="Bajar" @click="emit('move', 1)">
            <ChevronDown :size="13" />
          </button>
          <button class="icon-btn" title="Duplicar" @click="emit('duplicate')">
            <Copy :size="13" />
          </button>
          <button class="icon-btn" title="Borrar" @click="emit('remove')">
            <Trash2 :size="13" />
          </button>
        </template>
      </div>
    </header>

    <div class="flex flex-col gap-2">
      <slot />
    </div>

    <pre
      v-if="showSource"
      class="mt-2 p-2 rounded-[var(--radius)] bg-[var(--bg-sunken)] text-[11.5px] font-mono whitespace-pre-wrap break-words text-[var(--text-muted)] overflow-x-auto"
    >{{ source }}</pre>
  </section>
</template>
