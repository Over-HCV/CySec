<script setup lang="ts">
import { MacSegmentedControl, MacSegment } from '@macvue/core'
import { ChevronDown, AlertCircle, AlertTriangle, Info, Wrench } from 'lucide-vue-next'
import type { Compilation, Diagnostic } from '~/shared/types/database'

const props = defineProps<{
  compilation: Compilation | null
  open: boolean
  canRepair?: boolean
}>()
const emit = defineEmits<{ jump: [Diagnostic], toggle: [], repair: [] }>()

const tab = ref('problemas')

const icon = (level: Diagnostic['level']) =>
  level === 'error' ? AlertCircle : level === 'warning' ? AlertTriangle : Info

const color = (level: Diagnostic['level']) =>
  level === 'error'
    ? 'text-[var(--danger)]'
    : level === 'warning' ? 'text-[var(--warning)]' : 'text-[var(--text-faint)]'

const diagnostics = computed(() => props.compilation?.diagnostics ?? [])
const errors = computed(() => diagnostics.value.filter(d => d.level === 'error').length)

/**
 * Falta una clase o un paquete del propio proyecto (`cysec.cls`, `common/*`):
 * es lo que pasa cuando se importó solo la carpeta del taller, y tiene arreglo
 * de un clic — añadir la capa del curso.
 */
const missingClass = computed(() =>
  /File `[^']+\.(cls|sty)' not found/.test(props.compilation?.log ?? ''))
</script>

<template>
  <section class="flex flex-col pane border-t border-[var(--macvue-material-glass-regular-rim)] bg-[var(--bg-sunken)]">
    <header class="flex items-center gap-2 px-2 h-[var(--bar-h)] shrink-0">
      <button class="icon-btn" :title="open ? 'Plegar panel' : 'Desplegar panel'" @click="emit('toggle')">
        <ChevronDown :size="13" class="transition-transform duration-150" :class="open ? '' : '-rotate-90'" />
      </button>

      <MacSegmentedControl v-if="open" v-model="tab" size="mini">
        <MacSegment value="problemas">
          Problemas{{ diagnostics.length ? ` (${diagnostics.length})` : '' }}
        </MacSegment>
        <MacSegment value="log">Log</MacSegment>
      </MacSegmentedControl>

      <span class="flex-1" />

      <button
        v-if="canRepair && missingClass"
        class="chip hover:bg-[var(--bg-hover)]"
        title="Añade cysec.cls, common/* y la bibliografía del curso a este proyecto"
        @click="emit('repair')"
      >
        <Wrench :size="11" class="mr-1 inline align-[-1px]" /> Añadir capa del curso
      </button>

      <span v-if="compilation" class="text-[11px]" :class="errors ? 'text-[var(--danger)]' : 'text-[var(--success)]'">
        {{ errors ? `${errors} error(es)` : 'Compilación correcta' }}
        <span v-if="compilation.duration_ms" class="text-[var(--text-faint)]">
          · {{ (compilation.duration_ms / 1000).toFixed(1) }}s
        </span>
      </span>
    </header>

    <div v-if="open" class="flex-1 overflow-auto pane text-[11.5px]">
      <template v-if="tab === 'problemas'">
        <p v-if="!diagnostics.length" class="px-3 py-2 text-[var(--text-faint)]">
          Sin problemas que reportar.
        </p>
        <button
          v-for="(d, i) in diagnostics"
          :key="i"
          class="w-full flex items-start gap-2 px-3 py-[5px] text-left border-none bg-transparent hover:bg-[var(--bg-hover)]"
          @click="emit('jump', d)"
        >
          <component :is="icon(d.level)" :size="12" :class="[color(d.level), 'mt-[2px] shrink-0']" />
          <span class="flex-1 text-[var(--text)]">{{ d.message }}</span>
          <span class="text-[var(--text-faint)] font-mono shrink-0">
            {{ d.file }}<template v-if="d.line">:{{ d.line }}</template>
          </span>
        </button>
      </template>

      <pre
        v-else
        class="m-0 p-3 font-mono whitespace-pre text-[var(--text-muted)] overflow-auto"
      >{{ compilation?.log || 'Sin log.' }}</pre>
    </div>
  </section>
</template>
