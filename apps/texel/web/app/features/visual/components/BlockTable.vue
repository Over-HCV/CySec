<script setup lang="ts">
/**
 * Una tabla como rejilla: una caja por celda.
 *
 * Cada celda es un campo con su rango, así que escribir en una reemplaza solo
 * ese trozo del archivo —el `\toprule`, la especificación de columnas y un
 * `\multicolumn` que la interfaz no enseña siguen intactos— y dos personas
 * pueden escribir en celdas distintas a la vez sin pisarse.
 *
 * Las reglas horizontales no son filas: se pintan como la línea que son, encima
 * de la fila que abren, y no se pueden borrar desde aquí por lo mismo que no se
 * puede borrar media macro.
 */
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-vue-next'
import { VISUAL_API } from '../lib/api'
import { cellName, type Block } from '../lib/types'

const props = defineProps<{ block: Block }>()

const api = inject(VISUAL_API)!

const grid = computed(() => props.block.meta?.table ?? { cols: 0, rows: [] })
const columnas = computed(() => grid.value.cols)

/** Las filas con celdas; las de solo reglas se pintan pero no se editan. */
const filas = computed(() => grid.value.rows.map((row, index) => ({ ...row, index })))

/** Dónde cae una fila nueva: detrás de la última con celdas, no del `\bottomrule`. */
const finalDeDatos = computed(() => {
  const conCeldas = filas.value.filter(f => f.cells.length > 0)
  const ultima = conCeldas[conCeldas.length - 1]
  return ultima ? ultima.index + 1 : grid.value.rows.length
})

function campo(row: number, col: number) {
  return props.block.fields.find(f => f.name === cellName(row, col)) ?? null
}

function onCell(row: number, col: number, value: string) {
  const field = campo(row, col)
  if (field) api.edit(props.block, field, value)
}

const columnasField = computed(() =>
  props.block.fields.find(f => f.name === 'columnas') ?? null)
</script>

<template>
  <div class="pl-[15px]">
    <div class="rejilla" :style="{ '--cols': columnas }">
      <template v-for="fila in filas" :key="fila.index">
        <!-- La regla que abre la fila: se ve, se conserva, no se edita. -->
        <div v-if="fila.rule" class="regla" :title="fila.rule" />

        <div v-if="fila.cells.length" class="fila">
          <div class="mango">
            <template v-if="api.canWrite">
              <button class="icon-btn" title="Subir la fila" @click="api.shiftRow(block, fila.index, -1)">
                <ArrowUp :size="11" />
              </button>
              <button class="icon-btn" title="Bajar la fila" @click="api.shiftRow(block, fila.index, 1)">
                <ArrowDown :size="11" />
              </button>
              <button class="icon-btn" title="Añadir una fila debajo" @click="api.addRow(block, fila.index + 1)">
                <Plus :size="11" />
              </button>
              <button class="icon-btn" title="Borrar la fila" @click="api.deleteRow(block, fila.index)">
                <Trash2 :size="11" />
              </button>
            </template>
          </div>

          <div class="celdas">
            <div v-for="col in columnas" :key="col" class="celda">
              <BlockField
                v-if="campo(fila.index, col - 1)"
                :value="campo(fila.index, col - 1)!.value"
                :label="`Celda ${col}`"
                :multiline="campo(fila.index, col - 1)!.value.includes('\n')"
                :disabled="!api.canWrite"
                :problem="api.problems.value[`${block.id}:${cellName(fila.index, col - 1)}`]"
                @commit="onCell(fila.index, col - 1, $event)"
              />
              <!-- Una fila con menos celdas que columnas: un `\multicolumn`, o
                   una fila a medio escribir. Ni se inventa ni se borra. -->
              <span v-else class="hueca">—</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="pie">
      <button
        v-if="api.canWrite"
        class="anadir"
        title="Añadir una fila al final de la tabla"
        @click="api.addRow(block, finalDeDatos)"
      >
        <Plus :size="11" /> Añadir fila
      </button>

      <span class="flabel">Columnas</span>
      <BlockField
        v-if="columnasField"
        mono
        class="columnas"
        :value="columnasField.value"
        label="Columnas"
        :disabled="!api.canWrite"
        :problem="api.problems.value[`${block.id}:columnas`]"
        @commit="api.edit(block, columnasField!, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.rejilla {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px;
  border-radius: var(--macvue-ref-radius-5, 5px);
  background: var(--bg-sunken);
}

.fila {
  display: flex;
  align-items: flex-start;
  gap: 2px;
}

/*
  Las acciones de la fila solo aparecen cuando el ratón está en la tabla: son
  cuatro botones por fila y una tabla de veinte filas sería una pared.

  El carril mide lo que miden sus botones, ni un píxel menos: con un ancho fijo
  a ojo, el cuarto botón —el de borrar— se salía por encima de la primera celda
  y el clic se lo llevaba el campo de texto, así que la fila no se podía borrar.
  De ahí que el ancho salga de una cuenta (`--boton` × 4 + los tres huecos) y no
  de un número suelto, y que el carril además recorte lo que le sobre.
*/
.mango {
  --boton: 20px;
  display: flex;
  align-items: center;
  gap: 1px;
  flex: 0 0 calc(var(--boton) * 4 + 3px);
  width: calc(var(--boton) * 4 + 3px);
  overflow: hidden;
  opacity: 0;
  transition: opacity var(--macvue-duration-fast, 0.15s) ease-out;
}
/* Botones más pequeños que los de un bloque: aquí hay uno por fila. */
.mango :deep(.icon-btn) {
  width: var(--boton);
  height: var(--boton);
  flex: 0 0 var(--boton);
}
.fila:hover .mango,
.mango:focus-within { opacity: 1; }

.celdas {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.celda {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  border-radius: 4px;
  background: var(--bg-hover);
}
.celda:focus-within { outline: 1px solid var(--accent); }

.hueca {
  padding: 1px 5px;
  color: var(--text-faint);
  font-size: 12px;
}

.regla {
  /* Empieza donde empiezan las celdas: el carril de acciones más su hueco. */
  height: 1px;
  margin: 2px 0 2px calc(20px * 4 + 3px + 2px);
  background: var(--macvue-material-glass-regular-rim, var(--border));
}

.pie {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}
.anadir {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 18px;
  padding: 0 5px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-ui);
  font-size: 11px;
  cursor: pointer;
}
.anadir:hover { background: var(--bg-hover); color: var(--text); }

.flabel {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--text-faint);
}
.columnas { max-width: 180px; }
</style>
