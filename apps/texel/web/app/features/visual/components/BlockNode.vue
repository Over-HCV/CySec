<script setup lang="ts">
/**
 * Un bloque y, si es contenedor, los que lleva dentro.
 *
 * Todo bloque cabe en una fila: pliegue · icono · nombre · entradas · acciones.
 * Los hijos van indentados detrás de un riel, como un esquema. Es la única
 * forma de que anidar cinco niveles siga cabiendo en la pantalla, que es de lo
 * que se trata: un entorno de LaTeX es un objeto que contiene a otros.
 *
 * El componente es recursivo (se llama a sí mismo por nombre); las acciones no
 * suben por `emit` sino que se inyectan una vez desde `VisualEditor`.
 */
import { MacBadge, MacCheckbox } from '@macvue/core'
import * as lucide from 'lucide-vue-next'
import { Braces, ChevronRight, Code2, Copy, Plus, Trash2 } from 'lucide-vue-next'
import { fieldSpecOf, specOf } from '../lib/catalog'
import { VISUAL_API } from '../lib/api'
import type { Block, Field } from '../lib/types'

const props = defineProps<{
  block: Block
  depth: number
}>()

const api = inject(VISUAL_API)!

const spec = computed(() => specOf(props.block.kind))
const isContainer = computed(() => props.block.items !== undefined)
const isRaw = computed(() => props.block.kind === 'raw')
const open = computed(() => !api.collapsed.value.has(props.block.id))
const canWrite = computed(() => api.canWrite)

/** Los hijos en blanco existen en el documento pero no se pintan. */
const items = computed(() => (props.block.items ?? []).filter(b => !b.flags?.blank))

/** Nombre visible: el del entorno cuando lo hay, si no el del catálogo. */
const title = computed(() => props.block.meta?.env ?? spec.value.label)

/**
 * El icono del catálogo, que va por nombre. Se busca en `lucide` en vez de
 * importar veinte iconos a mano; si el nombre no existe, se ve el genérico.
 */
const icon = computed(() =>
  (lucide as unknown as Record<string, unknown>)[spec.value.icon] ?? Braces)

/**
 * Los campos de una línea van en la cabecera y los largos, debajo. Un `\input`
 * o un `\fuente` caben enteros en su fila; el enunciado de una pregunta no.
 *
 * A partir de tres campos cortos la fila deja de leerse — una entrada `.bib`
 * tiene título, autor, año y url —, así que bajan a una lista de «etiqueta:
 * valor», que sigue costando una línea por campo pero se entiende.
 */
const shortFields = computed(() => props.block.fields.filter(f => !isLong(f)))
const headerFields = computed(() => (shortFields.value.length <= 2 ? shortFields.value : []))
const listFields = computed(() => (shortFields.value.length > 2 ? shortFields.value : []))
const blockFields = computed(() => props.block.fields.filter(f => isLong(f)))

/**
 * Un campo baja de la cabecera cuando no cabe en ella. Que el catálogo lo
 * declare multilínea no basta: un enunciado de cuatro palabras cabe de sobra, y
 * bajarlo costaría una línea de pantalla para nada.
 */
function isLong(field: Field): boolean {
  return field.value.includes('\n') || field.value.length > 60
}

/**
 * Dónde se escribe es una cosa y con qué se escribe es otra: un campo que
 * admite varias líneas se edita en un área aunque hoy quepa en la cabecera, o
 * no habría forma de añadir la segunda línea.
 */
function isArea(field: Field): boolean {
  return fieldSpecOf(props.block.kind, field.name).multiline === true
    || field.value.includes('\n')
}

const showSource = ref(false)

/**
 * Borrar un contenedor se lleva por delante todo lo que tiene dentro, así que
 * pide un segundo clic. Una línea suelta se borra a la primera: pedir
 * confirmación para todo enseña a confirmar sin leer.
 */
const confirming = ref(false)
const needsConfirm = computed(() => items.value.length > 0)

function onRemove() {
  if (needsConfirm.value && !confirming.value) {
    confirming.value = true
    setTimeout(() => { confirming.value = false }, 3000)
    return
  }
  confirming.value = false
  api.remove(props.block)
}

/**
 * Solo se renombra un entorno genérico: cambiarle el nombre a un `caso` o a un
 * `mcq` no es renombrar, es convertirlo en otra cosa.
 */
const canRename = computed(() => props.block.kind === 'env' && api.canWrite)
const renaming = ref(false)

/** Al añadir dentro, se despliega: si no, el bloque nuevo nacería escondido. */
function onAddInside() {
  if (!open.value) api.toggleCollapse(props.block.id)
  api.addInside(props.block)
}

function onRename(name: string) {
  renaming.value = false
  if (name !== props.block.meta?.env) api.rename(props.block, name)
}

/** Aviso en la cabecera: hoy solo el de una respuesta sin escribir. */
const badge = computed(() => {
  if (props.block.kind !== 'respuesta') return null
  const body = api.text.value.slice(props.block.meta!.bodyFrom!, props.block.meta!.bodyTo!)
  return body.trim() === '' ? 'pendiente' : null
})

/** El contenido de un `raw` es su propio texto: el bloque entero es el campo. */
const rawField = computed<Field>(() => ({
  name: 'raw',
  span: props.block.span,
  value: api.source(props.block)
}))
</script>

<template>
  <div class="group/node">
    <!-- Cabecera: una sola línea, pase lo que pase. -->
    <div v-if="!isRaw" class="row">
      <button
        v-if="isContainer"
        class="twist"
        :class="{ 'twist-open': open }"
        :title="open ? 'Plegar' : 'Desplegar'"
        @click="api.toggleCollapse(block.id)"
      >
        <ChevronRight :size="12" />
      </button>
      <span v-else class="w-[15px]" />

      <component :is="icon" :size="12" class="text-[var(--text-faint)] shrink-0" />

      <MacCheckbox
        v-if="block.kind === 'opcion'"
        :model-value="block.flags?.correcta === true"
        :disabled="!canWrite"
        title="Marcar como correcta"
        @update:model-value="api.toggleOption(block)"
      />

      <!-- El nombre de un entorno se puede cambiar; al hacerlo se tocan a la
           vez el `\begin` y el `\end`, que si no el archivo queda roto. -->
      <span v-if="renaming" class="w-[130px]">
        <BlockField
          :value="block.meta!.env!"
          label="entorno"
          :problem="api.problems.value[`${block.id}:env`]"
          @commit="onRename"
        />
      </span>
      <button
        v-else
        class="name"
        :class="{ 'name-env': block.kind === 'env', 'name-static': !canRename }"
        :disabled="!canRename"
        :title="canRename ? 'Cambiar el entorno' : undefined"
        @click="renaming = canRename"
      >{{ title }}</button>
      <MacBadge v-if="badge">{{ badge }}</MacBadge>
      <span v-if="block.kind === 'section'" class="text-[10.5px] text-[var(--text-faint)]">
        nivel {{ block.meta?.nivel }}{{ block.flags?.starred ? ' ·  sin numerar' : '' }}
      </span>

      <template v-for="field in headerFields" :key="field.name">
        <span class="flabel">{{ fieldSpecOf(block.kind, field.name).label }}</span>
        <BlockField
          :value="field.value"
          :label="fieldSpecOf(block.kind, field.name).label"
          :multiline="isArea(field)"
          :disabled="!canWrite"
          :problem="api.problems.value[`${block.id}:${field.name}`]"
          @commit="api.edit(block, field, $event)"
        />
      </template>

      <span v-if="!headerFields.length" class="flex-1" />

      <div class="actions">
        <button class="icon-btn" title="Ver LaTeX" @click="showSource = !showSource">
          <Code2 :size="12" :class="showSource ? 'text-[var(--accent)]' : ''" />
        </button>
        <template v-if="canWrite">
          <button v-if="isContainer" class="icon-btn" title="Añadir dentro" @click="onAddInside">
            <Plus :size="12" />
          </button>
          <button class="icon-btn" title="Subir" @click="api.move(block, -1)">
            <ChevronRight :size="12" class="-rotate-90" />
          </button>
          <button class="icon-btn" title="Bajar" @click="api.move(block, 1)">
            <ChevronRight :size="12" class="rotate-90" />
          </button>
          <button class="icon-btn" title="Duplicar" @click="api.duplicate(block)">
            <Copy :size="12" />
          </button>
          <button
            class="icon-btn"
            :class="{ 'icon-btn-warn': confirming }"
            :title="confirming ? '¿Seguro? Se borra con lo que tiene dentro' : 'Borrar'"
            @click="onRemove"
          >
            <Trash2 :size="12" />
          </button>
        </template>
      </div>
    </div>

    <!-- Un `raw` no tiene cabecera: es texto y punto. Las acciones aparecen al pasar. -->
    <div v-else class="row row-raw">
      <BlockField
        multiline
        mono
        :value="rawField.value"
        label="LaTeX"
        :disabled="!canWrite"
        :problem="api.problems.value[`${block.id}:raw`]"
        @commit="api.edit(block, rawField, $event)"
      />
      <div class="actions self-start">
        <template v-if="canWrite">
          <button class="icon-btn" title="Subir" @click="api.move(block, -1)">
            <ChevronRight :size="12" class="-rotate-90" />
          </button>
          <button class="icon-btn" title="Bajar" @click="api.move(block, 1)">
            <ChevronRight :size="12" class="rotate-90" />
          </button>
          <button class="icon-btn" title="Borrar" @click="onRemove">
            <Trash2 :size="12" />
          </button>
        </template>
      </div>
    </div>

    <!-- Muchos campos cortos: uno por línea, con su etiqueta delante. -->
    <div v-if="listFields.length" class="pl-[15px]">
      <div v-for="field in listFields" :key="field.name" class="flex items-center gap-2">
        <span class="flabel w-[86px] shrink-0">{{ fieldSpecOf(block.kind, field.name).label }}</span>
        <BlockField
          :value="field.value"
          :label="fieldSpecOf(block.kind, field.name).label"
          :disabled="!canWrite"
          :problem="api.problems.value[`${block.id}:${field.name}`]"
          @commit="api.edit(block, field, $event)"
        />
      </div>
    </div>

    <!-- Campos largos: debajo, alineados con el riel de los hijos. -->
    <div v-if="blockFields.length && !isRaw" class="pl-[15px]">
      <BlockField
        v-for="field in blockFields"
        :key="field.name"
        multiline
        :value="field.value"
        :label="fieldSpecOf(block.kind, field.name).label"
        :disabled="!canWrite"
        :problem="api.problems.value[`${block.id}:${field.name}`]"
        @commit="api.edit(block, field, $event)"
      />
    </div>

    <pre v-if="showSource" class="source">{{ api.source(block) }}</pre>

    <!-- Hijos: riel de un píxel, indentación mínima. -->
    <div v-if="isContainer && open" class="rail">
      <BlockNode
        v-for="child in items"
        :key="child.id"
        :block="child"
        :depth="depth + 1"
      />

      <!-- Un contenedor vacío no puede quedarse sin nada que enseñar: parecería
           roto y no habría dónde pulsar para empezar a escribir dentro. -->
      <button v-if="!items.length" class="empty" :disabled="!canWrite" @click="onAddInside">
        <Plus :size="11" /> <span>{{ canWrite ? 'escribir dentro' : 'vacío' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
  border-radius: var(--macvue-ref-radius-5, 5px);
  padding: 0 2px;
}
.row:hover { background: var(--bg-hover); }
.row-raw { align-items: flex-start; padding-left: 15px; }

.name {
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  cursor: pointer;
}
.name-static { cursor: default; }

/* Borrado a la espera de confirmación. */
:deep(.icon-btn-warn) {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 14%, transparent);
}

/* Etiqueta de campo: la mínima para saber qué se está escribiendo. */
.flabel {
  font-size: 10.5px;
  color: var(--text-faint);
  white-space: nowrap;
}
/* El nombre de un entorno es literal: se enseña como código. */
.name-env {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-muted);
}

.twist {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  border: 0;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  transition: transform var(--macvue-duration-fast, 0.15s) ease-out;
}
.twist-open { transform: rotate(90deg); }

.actions {
  display: flex;
  align-items: center;
  gap: 1px;
  margin-left: auto;
  opacity: 0;
  transition: opacity var(--macvue-duration-fast, 0.15s) ease-out;
}
.group\/node:hover > .row > .actions,
.actions:focus-within { opacity: 1; }

.rail {
  margin-left: 7px;
  padding-left: 7px;
  border-left: 1px solid var(--macvue-material-glass-regular-rim, var(--border));
}

.empty {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 18px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--text-faint);
  font-size: 11px;
  cursor: pointer;
  opacity: 0.65;
}
.empty:hover:not(:disabled) { opacity: 1; }
.empty:disabled { cursor: default; }

.source {
  margin: 2px 0 2px 15px;
  padding: 5px 7px;
  border-radius: var(--macvue-ref-radius-5, 5px);
  background: var(--bg-sunken);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11.5px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
