import { describe, expect, it } from 'vitest'
import { EDGE, GAP, MIN_ROOM, placeMenu } from '../app/shared/lib/anchor-menu'

const VIEW = { width: 1440, height: 900 }

/** Un botón de la barra de título: 24 px de alto, a 40 px del borde superior. */
const header = { top: 40, bottom: 64, left: 1200, right: 1260, width: 60 }

describe('placeMenu', () => {
  it('abre debajo del botón cuando cabe', () => {
    const at = placeMenu(header, { width: 180, height: 120 }, VIEW)
    expect(at.flipped).toBe(false)
    expect(at.top).toBe(header.bottom + GAP)
    expect(at.left).toBe(header.left)
  })

  // El caso que rompía los menús de macvue: con el botón arriba del todo, un
  // menú alto tiene que seguir cayendo hacia abajo y scrollear.
  it('no se vuelca hacia arriba desde la cabecera aunque no quepa entero', () => {
    const at = placeMenu(header, { width: 180, height: 2000 }, VIEW)
    expect(at.flipped).toBe(false)
    expect(at.top).toBe(header.bottom + GAP)
    expect(at.maxHeight).toBe(VIEW.height - header.bottom - GAP - EDGE)
  })

  it('se vuelca hacia arriba cuando el botón está abajo', () => {
    const bottom = { top: 860, bottom: 884, left: 100, right: 160, width: 60 }
    const at = placeMenu(bottom, { width: 180, height: 200 }, VIEW)
    expect(at.flipped).toBe(true)
    expect(at.top).toBe(bottom.top - GAP - 200)
    expect(at.top).toBeGreaterThanOrEqual(EDGE)
  })

  // Ventana muy baja: no hay 120 px ni arriba ni abajo. Se le dan igual y el
  // menú scrollea; recortarlo a lo que queda lo dejaría en una rendija.
  it('nunca deja el menú por debajo del alto mínimo', () => {
    const short = { width: 1440, height: 200 }
    const middle = { top: 90, bottom: 114, left: 100, right: 160, width: 60 }
    const at = placeMenu(middle, { width: 180, height: 300 }, short)
    expect(at.maxHeight).toBe(MIN_ROOM)
    expect(at.top).toBeGreaterThanOrEqual(EDGE)
  })

  // El botón «Añadir bloque» vive al final del documento: hacia abajo casi nunca
  // hay sitio, y cuando lo hay tampoco se quiere ir hacia allá.
  it('con prefer=above se vuelca hacia arriba aunque abajo quepa', () => {
    const middle = { top: 400, bottom: 424, left: 100, right: 260, width: 160 }
    const at = placeMenu(middle, { width: 260, height: 200 }, VIEW, 'start', 'above')
    expect(at.flipped).toBe(true)
    expect(at.top).toBe(middle.top - GAP - 200)
  })

  // Documento vacío: el mismo botón está pegado al borde superior. `prefer` es
  // una preferencia, no una imposición.
  it('con prefer=above cae hacia abajo si arriba no cabe', () => {
    const at = placeMenu(header, { width: 260, height: 200 }, VIEW, 'start', 'above')
    expect(at.flipped).toBe(false)
    expect(at.top).toBe(header.bottom + GAP)
  })

  // Ni arriba ni abajo cabe entero: se queda arriba, que es lo pedido, y
  // scrollea con el hueco que haya.
  it('con prefer=above se queda arriba si arriba hay más sitio aunque no quepa', () => {
    const low = { top: 700, bottom: 724, left: 100, right: 260, width: 160 }
    const at = placeMenu(low, { width: 260, height: 900 }, VIEW, 'start', 'above')
    expect(at.flipped).toBe(true)
    expect(at.maxHeight).toBe(low.top - GAP - EDGE)
    expect(at.top).toBe(EDGE)
  })

  it('alinea por el borde derecho con align=end', () => {
    const at = placeMenu(header, { width: 180, height: 120 }, VIEW, 'end')
    expect(at.left).toBe(header.right - 180)
  })

  it('no se sale por ningún borde lateral', () => {
    const far = { top: 40, bottom: 64, left: 1420, right: 1436, width: 16 }
    const at = placeMenu(far, { width: 300, height: 120 }, VIEW)
    expect(at.left).toBe(VIEW.width - 300 - EDGE)

    const near = { top: 40, bottom: 64, left: 2, right: 18, width: 16 }
    expect(placeMenu(near, { width: 300, height: 120 }, VIEW).left).toBe(EDGE)
  })

  it('cabe en una ventana más estrecha que el propio menú', () => {
    const narrow = { width: 200, height: 900 }
    const at = placeMenu(header, { width: 300, height: 120 }, narrow)
    expect(at.left).toBe(EDGE)
  })
})
