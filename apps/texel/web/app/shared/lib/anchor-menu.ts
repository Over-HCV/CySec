/**
 * Dónde va un menú anclado a su botón.
 *
 * Aparte del componente porque es lo único de `AppMenu` que puede estar mal sin
 * que se note a simple vista: el caso que rompía los menús de macvue —un botón
 * a 40 px del borde superior de la ventana— es justo el que no se prueba a mano
 * cuando la ventana está maximizada.
 *
 * Todo en coordenadas de viewport, que es lo que devuelve
 * `getBoundingClientRect()` y lo que entiende `position: fixed`.
 */

/** Aire contra el borde de la ventana. */
export const EDGE = 8
/** Separación entre el botón y su menú. */
export const GAP = 4
/**
 * Alto mínimo que se le concede al menú aunque no quepa: por debajo de esto no
 * es un menú, es una rendija. Con menos sitio, scrollea.
 */
export const MIN_ROOM = 120

/** Hacia dónde se abre un menú. */
export type Side = 'below' | 'above'

export interface Box { width: number, height: number }

export interface Anchor {
  top: number
  bottom: number
  left: number
  right: number
  width: number
}

export interface Placement {
  left: number
  top: number
  minWidth: number
  maxHeight: number
  /** Abierto hacia arriba porque debajo no cabía. */
  flipped: boolean
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max))

export function placeMenu(
  anchor: Anchor,
  menu: Box,
  view: Box,
  align: 'start' | 'end' = 'start',
  prefer: Side = 'below'
): Placement {
  const below = view.height - anchor.bottom - GAP - EDGE
  const above = anchor.top - GAP - EDGE

  // Con `below`: debajo salvo que no quepa y arriba haya más sitio. Nunca se
  // elige arriba «por poco»: un menú que cae hacia abajo es lo que espera todo
  // el mundo.
  //
  // Con `above`: arriba mientras quepa; si no cabe, donde haya más hueco. Es
  // para un botón que vive al final de una lista larga — el menú de bloques del
  // editor visual. Sigue siendo una preferencia: con el documento vacío ese
  // mismo botón está pegado al borde superior, arriba no hay nada y cae abajo.
  const flipped = prefer === 'above'
    ? menu.height <= above || above >= below
    : menu.height > below && above > below
  const maxHeight = Math.max(flipped ? above : below, MIN_ROOM)

  const left = align === 'end' ? anchor.right - menu.width : anchor.left

  return {
    left: Math.round(clamp(left, EDGE, view.width - menu.width - EDGE)),
    top: Math.round(flipped
      ? Math.max(anchor.top - GAP - Math.min(menu.height, maxHeight), EDGE)
      : anchor.bottom + GAP),
    minWidth: Math.round(anchor.width),
    maxHeight: Math.round(maxHeight),
    flipped
  }
}
