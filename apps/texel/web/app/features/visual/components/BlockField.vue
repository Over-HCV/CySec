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
 */
const props = defineProps<{
  label: string
  value: string
  multiline?: boolean
  disabled?: boolean
  placeholder?: string
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

function onInput(event: Event) {
  draft.value = (event.target as HTMLInputElement | HTMLTextAreaElement).value
  if (timer) clearTimeout(timer)
  timer = setTimeout(commit, COMMIT_MS)
}

function commit() {
  if (timer) { clearTimeout(timer); timer = null }
  if (draft.value !== props.value) emit('commit', draft.value)
}

function onBlur() {
  focused.value = false
  commit()
}

onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

/** Alto de la caja: crece con el contenido, sin pasarse. */
const rows = computed(() => Math.min(Math.max(draft.value.split('\n').length, 2), 14))
</script>

<template>
  <label class="block">
    <span class="text-[10.5px] uppercase tracking-wide text-[var(--text-faint)]">{{ label }}</span>

    <textarea
      v-if="multiline"
      :value="draft"
      :rows="rows"
      :disabled="disabled"
      :placeholder="placeholder"
      class="field"
      :class="{ 'field-mono': mono, 'field-bad': problem }"
      @input="onInput"
      @focus="focused = true"
      @blur="onBlur"
    />
    <input
      v-else
      :value="draft"
      :disabled="disabled"
      :placeholder="placeholder"
      class="field"
      :class="{ 'field-mono': mono, 'field-bad': problem }"
      @input="onInput"
      @focus="focused = true"
      @blur="onBlur"
      @keydown.enter.prevent="commit"
    >

    <span v-if="problem" class="text-[11px] text-[var(--danger)]">{{ problem }}</span>
  </label>
</template>

<style scoped>
.field {
  display: block;
  width: 100%;
  margin-top: 2px;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-raised);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.45;
  resize: vertical;
}
.field:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.field:disabled {
  background: var(--bg-sunken);
  color: var(--text-muted);
  cursor: default;
}
.field-mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.field-bad {
  border-color: var(--danger);
}
</style>
