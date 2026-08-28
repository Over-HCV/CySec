/**
 * Qué campo de texto tiene el foco ahora mismo.
 *
 * La barra de formato vive en la cabecera del panel y los campos están metidos
 * en el árbol de bloques, a cualquier profundidad. En vez de bajar la barra a
 * cada campo —o de encadenar `emit` por seis niveles—, cada campo se anuncia al
 * recibir el foco y la barra manda sobre el último que se anunció.
 *
 * `mousedown` de la barra no debe robar el foco (`@mousedown.prevent`), o el
 * campo se cerraría justo antes de recibir la orden.
 */
export type FormatCommand = 'bold' | 'italic' | 'code' | 'clear'

export interface FormatTarget {
  apply: (command: FormatCommand) => void
  /** Marcas activas donde está el cursor, para encender los botones. */
  active: () => FormatCommand[]
}

const target = shallowRef<FormatTarget | null>(null)
/** Cambia con cada selección: obliga a recalcular qué botones van encendidos. */
const pulse = ref(0)

export function useFormatting() {
  return {
    /** ¿Hay dónde aplicar formato? */
    available: computed(() => target.value !== null),
    active: computed(() => { void pulse.value; return target.value?.active() ?? [] }),
    apply: (command: FormatCommand) => target.value?.apply(command),
    /** Lo llama un campo al recibir el foco. */
    claim: (next: FormatTarget) => { target.value = next; pulse.value++ },
    /** Lo llama al perderlo; solo suelta si sigue siendo el suyo. */
    release: (previous: FormatTarget) => {
      if (target.value === previous) target.value = null
    },
    /** Lo llama al mover el cursor o la selección. */
    refresh: () => { pulse.value++ }
  }
}
