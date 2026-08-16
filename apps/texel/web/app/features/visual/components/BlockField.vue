<script setup lang="ts">
/**
 * Un campo editable de un bloque.
 *
 * Mientras tiene el foco, el campo manda: guarda su propio borrador y no se
 * repinta con lo que llegue del documento. Sin esto, cada reparseo — el nuestro
 * y el de quien esté escribiendo al otro lado — devolvería el cursor al
 * principio a media palabra.
 *
 * Al soltar el foco vuelve a seguir al documento, así que un cambio ajeno sí se
 * ve en cuanto dejas de escribir.
 *
 * El foco se escucha con `focusin`/`focusout`, no con `focus`/`blur`: estos
 * últimos no burbujean y el campo de macvue envuelve su `<input>` en un div.
 */
import { MacTextField } from '@macvue/core'

const props = defineProps<{
  value: string
  /** Va de `placeholder`; no se pinta encima como etiqueta: costaría una línea. */
  label: string
  multiline?: boolean
  disabled?: boolean
  /** Aviso de validación: el valor no llegó a escribirse. */
  problem?: string
  mono?: boolean
}>()

const emit = defineEmits<{ commit: [string] }>()

/** Espera antes de escribir en el documento mientras se teclea. */
const COMMIT_MS = 300

const draft = ref(props.value)
const focused = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

watch(() => props.value, (next) => {
  if (!focused.value) draft.value = next
})

function onInput(next: string) {
  draft.value = next
  if (timer) clearTimeout(timer)
  timer = setTimeout(commit, COMMIT_MS)
}

function commit() {
  if (timer) { clearTimeout(timer); timer = null }
  if (draft.value !== props.value) emit('commit', draft.value)
}

function onFocusOut() {
  focused.value = false
  commit()
}

onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

/**
 * Alto de la caja: crece con el contenido, sin pasarse. Los saltos del final no
 * cuentan — son la separación entre bloques del archivo, y reservarles línea
 * dejaría un agujero debajo de cada párrafo. Siguen ahí: el texto no se toca.
 */
const rows = computed(() =>
  Math.min(Math.max(draft.value.replace(/\s+$/, '').split('\n').length, 1), 20))
</script>

<template>
  <div class="min-w-0 flex-1" @focusin="focused = true" @focusout="onFocusOut">
    <textarea
      v-if="multiline"
      :value="draft"
      :rows="rows"
      :disabled="disabled"
      :placeholder="label"
      class="area"
      :class="{ 'area-mono': mono, 'area-bad': problem }"
      @input="onInput(($event.target as HTMLTextAreaElement).value)"
    />
    <MacTextField
      v-else
      class="w-full"
      :model-value="draft"
      :disabled="disabled"
      :placeholder="label"
      size="small"
      @update:model-value="onInput"
      @keydown.enter.prevent="commit"
    />

    <span v-if="problem" class="block text-[11px] text-[var(--danger)]">{{ problem }}</span>
  </div>
</template>

<style scoped>
/*
  El multilínea es propio: macvue no trae área de texto. Sin borde hasta que se
  usa, para que veinte bloques seguidos no sean veinte cajas.
*/
.area {
  display: block;
  width: 100%;
  padding: 1px 5px;
  border: 1px solid transparent;
  border-radius: var(--macvue-ref-radius-5, 5px);
  background: transparent;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.45;
  resize: none;
  overflow: hidden;
}
.area:hover:not(:disabled) {
  border-color: var(--macvue-material-glass-regular-rim, var(--border));
}
.area:focus {
  outline: none;
  overflow: auto;
  resize: vertical;
  background: var(--macvue-control-bg, var(--bg-raised));
  border-color: var(--accent);
  box-shadow: 0 0 0 var(--macvue-focus-ring-width, 3.5px) var(--macvue-focus-ring, var(--accent-soft));
}
.area:disabled { color: var(--text-muted); cursor: default; }
.area-mono { font-family: var(--font-mono); font-size: 12px; }
.area-bad { border-color: var(--danger); }
</style>
