<script setup lang="ts">
/**
 * Un bloque de código: el cuerpo literal y el lenguaje con el que se colorea.
 *
 * Tiene componente propio por lo mismo que la imagen: el cuerpo de un
 * `lstlisting` no es texto con formato sino texto tal cual —una llave es una
 * llave y un `\n` cuenta—, así que no puede pasar por `RichText` ni por el
 * marco de campos de `BlockNode`, que reparte los campos entre la cabecera y el
 * cuerpo según lo largos que sean.
 */
import { LST_LANGUAGES } from '../lib/catalog'
import { VISUAL_API } from '../lib/api'
import type { Block, Field } from '../lib/types'

const props = defineProps<{ block: Block }>()

const api = inject(VISUAL_API)!

const campo = (name: string): Field | null => props.block.fields.find(f => f.name === name) ?? null
const codigo = computed(() => campo('codigo'))
const lenguaje = computed(() => campo('lenguaje')?.value ?? '')

/**
 * Un lenguaje que el archivo trae y no está en la lista —alguien lo escribió a
 * mano en la pestaña Código— se ofrece igual: el desplegable no es la ocasión
 * de perderlo sin decir nada.
 */
const idiomas = computed(() => (LST_LANGUAGES.includes(lenguaje.value)
  ? LST_LANGUAGES
  : [...LST_LANGUAGES, lenguaje.value]))

function onCode(value: string) {
  const field = codigo.value
  if (field) api.edit(props.block, field, value)
}
</script>

<template>
  <div class="pl-[15px]">
    <div class="marco">
      <BlockField
        multiline
        mono
        :max-rows="400"
        :value="codigo?.value ?? ''"
        label="Escribe aquí el comando o el payload…"
        :disabled="!api.canWrite"
        :problem="api.problems.value[`${block.id}:codigo`]"
        @commit="onCode"
      />
    </div>

    <div class="pie">
      <span class="flabel">Lenguaje</span>
      <select
        class="idioma"
        :value="lenguaje"
        :disabled="!api.canWrite"
        title="Con qué reglas se colorea el código en el PDF"
        @change="api.setLanguage(block, ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="valor in idiomas" :key="valor" :value="valor">
          {{ valor || 'sin lenguaje' }}
        </option>
      </select>
      <span v-if="api.problems.value[`${block.id}:lenguaje`]" class="aviso">
        {{ api.problems.value[`${block.id}:lenguaje`] }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* El mismo hueco hundido que la miniatura de una imagen: es contenido que se
   mira, no un campo de formulario. */
.marco {
  padding: 4px 6px;
  border-radius: var(--macvue-ref-radius-5, 5px);
  background: var(--bg-sunken);
}

.pie {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}
.flabel {
  font-size: 10.5px;
  color: var(--text-faint);
}
.aviso {
  font-size: 11px;
  color: var(--danger);
}
.idioma {
  height: 18px;
  padding: 0 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
}
.idioma:hover:not(:disabled) { background: var(--bg-hover); }
</style>
