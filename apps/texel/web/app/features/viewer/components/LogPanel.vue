<script setup lang="ts">
import { AlertCircle, AlertTriangle, Info } from 'lucide-vue-next'
import type { Compilation, Diagnostic } from '~/shared/types/database'

const props = defineProps<{ compilation: Compilation | null }>()
const emit = defineEmits<{ jump: [Diagnostic] }>()

const tab = ref<'problemas' | 'log'>('problemas')

const icon = (level: Diagnostic['level']) =>
  level === 'error' ? AlertCircle : level === 'warning' ? AlertTriangle : Info

const color = (level: Diagnostic['level']) =>
  level === 'error' ? 'text-danger' : level === 'warning' ? 'text-warning' : 'text-muted'

const diagnostics = computed(() => props.compilation?.diagnostics ?? [])
const errors = computed(() => diagnostics.value.filter(d => d.level === 'error').length)
</script>

<template>
  <div class="h-full flex flex-col border-t border-border bg-raised">
    <header class="flex items-center gap-3 px-3 h-8 border-b border-border text-xs">
      <button
        class="border-none bg-transparent px-0"
        :class="tab === 'problemas' ? 'text-accent font-semibold' : 'text-muted'"
        @click="tab = 'problemas'"
      >
        Problemas
        <span v-if="diagnostics.length" class="ml-1 text-[10px]">({{ diagnostics.length }})</span>
      </button>
      <button
        class="border-none bg-transparent px-0"
        :class="tab === 'log' ? 'text-accent font-semibold' : 'text-muted'"
        @click="tab = 'log'"
      >
        Log completo
      </button>
      <span class="flex-1" />
      <span v-if="compilation" :class="errors ? 'text-danger' : 'text-success'">
        {{ errors ? `${errors} error(es)` : 'Compilación correcta' }}
        <span v-if="compilation.duration_ms" class="text-muted">
          · {{ (compilation.duration_ms / 1000).toFixed(1) }}s
        </span>
      </span>
    </header>

    <div class="flex-1 overflow-auto text-xs">
      <template v-if="tab === 'problemas'">
        <p v-if="!diagnostics.length" class="p-3 text-muted">
          Sin problemas que reportar.
        </p>
        <button
          v-for="(d, i) in diagnostics"
          :key="i"
          class="w-full flex items-start gap-2 px-3 py-1.5 text-left border-none bg-transparent hover:bg-sunken"
          @click="emit('jump', d)"
        >
          <component :is="icon(d.level)" :size="13" :class="[color(d.level), 'mt-0.5 shrink-0']" />
          <span class="flex-1 text-text">{{ d.message }}</span>
          <span class="text-muted font-mono shrink-0">
            {{ d.file }}<template v-if="d.line">:{{ d.line }}</template>
          </span>
        </button>
      </template>

      <pre v-else class="p-3 font-mono whitespace-pre-wrap text-muted">{{ compilation?.log || 'Sin log.' }}</pre>
    </div>
  </div>
</template>
