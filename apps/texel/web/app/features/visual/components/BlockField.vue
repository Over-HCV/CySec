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

const props = defineProps<{
  value: string
  /** Va de `placeholder`; no se pinta encima como etiqueta: costaría una línea. */
  label: string
  multiline?: boolean
  disabled?: boolean
  /** Aviso de validación: el valor no llegó a escribirse. */
  problem?: string
  mono?: boolean
  /**
   * Tope de líneas antes de hacer scroll dentro del campo. Cuando alguien
   * despliega un bloque de LaTeX quiere leerlo entero: ahí no se pone tope, se
   * deja crecer y que haga scroll la página.
   */
  maxRows?: number
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
  Math.min(Math.max(draft.value.replace(/\s+$/, '').split('\n').length, 1), props.maxRows ?? 20))
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
    <input
      v-else
      :value="draft"
      :disabled="disabled"
      :placeholder="label"
      class="flat"
      :class="{ 'flat-mono': mono, 'flat-bad': problem }"
      @input="onInput(($event.target as HTMLInputElement).value)"
      @keydown.enter.prevent="commit"
    >

    <span v-if="problem" class="block text-[11px] text-[var(--danger)]">{{ problem }}</span>
  </div>
</template>

<style scoped>
/*
  Los campos de un bloque se leen como texto, no como formulario: sin caja ni
  fondo hasta que el ratón pasa por encima. Un documento con treinta campos
  pintados como treinta cajas negras no hay quien lo lea.
*/
.flat {
  display: block;
  width: 100%;
  padding: 1px 5px;
  border: 1px solid transparent;
  border-radius: var(--macvue-ref-radius-5, 5px);
  background: transparent;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.5;
  outline: none;
}
.flat::placeholder { color: var(--text-faint); }
.flat:hover:not(:disabled) { background: var(--bg-hover); }
.flat:focus {
  background: var(--bg-hover);
  border-color: var(--macvue-material-glass-regular-rim, var(--border));
}
.flat:disabled { color: var(--text-muted); }
.flat-mono { font-family: var(--font-mono); font-size: 12px; }
.flat-bad { border-color: var(--danger); }

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
.area:hover:not(:disabled) { background: var(--bg-hover); }
.area:focus {
  outline: none;
  overflow: auto;
  resize: vertical;
  background: var(--bg-hover);
  border-color: var(--macvue-material-glass-regular-rim, var(--border));
}
.area:disabled { color: var(--text-muted); cursor: default; }
.area-mono { font-family: var(--font-mono); font-size: 12px; }
.area-bad { border-color: var(--danger); }
</style>
