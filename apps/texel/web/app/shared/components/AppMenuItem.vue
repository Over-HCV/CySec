<script setup lang="ts">
/**
 * Fila de `AppMenu`. La marca de verificación ocupa sitio siempre —a
 * `opacity: 0` cuando no toca— para que las etiquetas no bailen al cambiar de
 * opción, que es como estaban ya las opciones de compilación.
 */
import { Check } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  checked?: boolean
  disabled?: boolean
  /** Segunda línea, en gris: para qué sirve la opción. */
  hint?: string
}>(), { checked: false, disabled: false, hint: undefined })

const emit = defineEmits<{ select: [] }>()

const close = inject<() => void>('appMenuClose', () => {})

function onSelect() {
  if (props.disabled) return
  emit('select')
  close()
}
</script>

<template>
  <button
    type="button"
    class="app-menu-item"
    role="menuitem"
    :aria-disabled="disabled || undefined"
    :disabled="disabled"
    @click="onSelect"
  >
    <!-- El hueco del check lo puede ocupar otra cosa: el menú de bloques pone
         ahí el icono de cada tipo, que no tiene nada que marcar. -->
    <slot name="icon">
      <Check :size="12" class="shrink-0 mt-[3px]" :class="checked ? '' : 'opacity-0'" />
    </slot>
    <span class="flex-1 min-w-0 text-left">
      <span class="block">
        <slot />
      </span>
      <span v-if="hint" class="block text-[11px] text-[var(--text-faint)]">{{ hint }}</span>
    </span>
  </button>
</template>
