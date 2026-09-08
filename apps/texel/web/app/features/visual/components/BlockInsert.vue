<script setup lang="ts">
/**
 * La tira donde se añade un bloque.
 *
 * Antes solo se podía añadir al final del archivo, así que escribir en medio de
 * un taller pedía crear el bloque abajo y subirlo a golpe de flecha. Ahora hay
 * una de estas entre cada dos bloques —y dentro de cada contenedor—, invisible
 * hasta que el ratón pasa por encima: el sitio donde se va a escribir es el
 * hueco que se está señalando, no una barra en otra parte de la pantalla.
 *
 * El bloque vecino es también la guarda de la escritura (ver `insertAt` en
 * `useBlocks`), de modo que si el documento se movió por debajo, no se escribe
 * en el sitio equivocado.
 */
import { Plus } from 'lucide-vue-next'
import { insertable, type BlockSpec } from '../lib/catalog'
import { iconOf } from '../lib/icons'
import { VISUAL_API } from '../lib/api'
import type { Block, BlockKind, DocKind } from '../lib/types'

const props = withDefaults(defineProps<{
  doc: DocKind
  /** Junto a qué bloque se escribe. `null` es «al final del documento». */
  block?: Block | null
  edge?: 'before' | 'after' | 'inside'
  /** Hacia dónde intenta abrirse el menú; abajo del todo, hacia arriba. */
  prefer?: 'above' | 'below'
}>(), {
  block: null,
  edge: 'after',
  prefer: 'below'
})

const api = inject(VISUAL_API)!

const opciones = computed<BlockSpec[]>(() => insertable(props.doc))

/** Una imagen no se puede plantillar: primero hay que subir el archivo. */
function elegir(kind: BlockKind) {
  if (kind === 'figura') { api.askImage(props.block, props.edge); return }
  if (!props.block) { api.insertAtEnd(kind); return }
  if (props.edge === 'inside') { api.addInside(props.block, kind); return }
  api.insertAt(props.block, props.edge, kind)
}
</script>

<template>
  <div v-if="api.canWrite" class="tira">
    <AppMenu :prefer="prefer" trigger-class="mas" title="Añadir un bloque aquí">
      <template #trigger>
        <Plus :size="11" />
      </template>

      <div class="block-menu-grid">
        <AppMenuItem
          v-for="spec in opciones"
          :key="spec.kind"
          :hint="spec.kind === 'figura' && !api.canUpload
            ? 'Aquí no: este documento no está dentro de un proyecto'
            : spec.hint"
          :disabled="spec.kind === 'figura' && !api.canUpload"
          @select="elegir(spec.kind)"
        >
          <template #icon>
            <component :is="iconOf(spec.icon)" :size="12" class="shrink-0 mt-[3px]" />
          </template>
          {{ spec.label }}
        </AppMenuItem>
      </div>
    </AppMenu>
  </div>
</template>

<style scoped>
/*
  Alto fijo y pequeño: la tira ocupa sitio siempre —si apareciera al pasar el
  ratón, el documento entero daría un salto de dos píxeles cada vez—, pero solo
  se ve cuando se apunta a ella.
*/
.tira {
  position: relative;
  display: flex;
  align-items: center;
  height: 8px;
  opacity: 0;
  transition: opacity var(--macvue-duration-fast, 0.15s) ease-out;
}
.tira:hover,
.tira:focus-within { opacity: 1; }

/* La línea que enseña dónde va a caer el bloque. */
.tira::after {
  content: '';
  position: absolute;
  left: 20px;
  right: 0;
  height: 1px;
  background: var(--accent);
  opacity: 0.35;
  pointer-events: none;
}

:deep(.mas) {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid var(--macvue-material-glass-regular-rim, var(--border));
  border-radius: 4px;
  background: var(--bg-raised, var(--bg-sunken));
  color: var(--text-muted);
  cursor: pointer;
}
:deep(.mas:hover) { color: var(--text); background: var(--bg-hover); }
</style>
