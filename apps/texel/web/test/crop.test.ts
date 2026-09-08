import { describe, expect, it } from 'vitest'
import {
  clampCrop, cropOf, formatCrop, isFullCrop, moveCrop, parseCrop, resizeCrop,
  setGraphicsOptions, thumbBox, thumbStyle, windowOf, type Crop
} from '../app/features/visual/lib/crop'

const CROP: Crop = { l: 0.1, b: 0.05, r: 0.2, t: 0.25 }

describe('parseCrop / formatCrop', () => {
  it('lee las cuatro medidas en el orden de trim', () => {
    expect(parseCrop('{0.1\\width} {0.05\\height} {0.2\\width} {0.25\\height}')).toEqual(CROP)
    // Sin llaves también se lee: un `trim` escrito a mano puede no llevarlas.
    expect(parseCrop('0.1\\width 0.05\\height 0.2\\width 0.25\\height')).toEqual(CROP)
  })

  it('vuelve del texto al recorte y al revés sin perder nada', () => {
    const texto = formatCrop(CROP)
    expect(texto).toBe('{0.1\\width} {0.05\\height} {0.2\\width} {0.25\\height}')
    expect(parseCrop(texto)).toEqual(CROP)
  })

  it('escribe un cero pelado, no «0.0000»', () => {
    expect(formatCrop({ l: 0, b: 0.5, r: 0, t: 0 }))
      .toBe('{0\\width} {0.5\\height} {0\\width} {0\\height}')
  })

  it('redondea a cuatro decimales', () => {
    expect(formatCrop({ l: 1 / 3, b: 0, r: 0, t: 0 }))
      .toBe('{0.3333\\width} {0\\height} {0\\width} {0\\height}')
  })

  it('no se inventa un rectángulo cuando el trim no es relativo', () => {
    // Un `trim` en centímetros es LaTeX válido, pero no es algo que esta
    // interfaz sepa mover: mejor decir «no hay recorte» que enseñarlo mal.
    expect(parseCrop('1cm 1cm 1cm 1cm')).toBeNull()
    expect(parseCrop('0.1\\width 0.1\\height')).toBeNull()
    expect(parseCrop('0.6\\width 0\\height 0.6\\width 0\\height')).toBeNull()
    expect(parseCrop('-0.1\\width 0\\height 0\\width 0\\height')).toBeNull()
  })
})

describe('la forma del trim (regresión)', () => {
  it('escribe una llave por lado, no las cuatro medidas en una', () => {
    // Con `trim={a b c d}` adjustbox lee `a`, lo aplica a los cuatro lados y se
    // come el resto sin avisar: la imagen sale recortada, pero no por donde se
    // pidió. Medido con xelatex sobre una imagen de 1084 pt de ancho:
    //   trim={0.12\width 0.05\height 0.2\width 0.25\height} → 823.9 pt (=76 %,
    //     o sea 1 − 0.12 − 0.12), cuando lo pedido era 68 % (1 − 0.12 − 0.2)
    //   trim={0.12\width} {0.05\height} {0.2\width} {0.25\height} → correcto
    const texto = formatCrop(CROP)
    expect(texto.match(/\{/g)).toHaveLength(4)
    expect(texto).not.toMatch(/^\{[^}]*\\height[^}]*\}$/)
  })
})

describe('clampCrop', () => {
  it('no deja lados negativos', () => {
    expect(clampCrop({ l: -0.3, b: 0, r: 0, t: -1 })).toEqual({ l: 0, b: 0, r: 0, t: 0 })
  })

  it('deja siempre algo de imagen', () => {
    const crop = clampCrop({ l: 0.9, b: 0, r: 0.9, t: 0 })
    expect(crop.l + crop.r).toBeLessThanOrEqual(1 - 0.02)
  })
})

describe('resizeCrop', () => {
  it('cada letra de la manija mueve su lado', () => {
    expect(resizeCrop(CROP, 'l', 0.1, 0).l).toBeCloseTo(0.2)
    expect(resizeCrop(CROP, 'r', 0.1, 0).r).toBeCloseTo(0.1)
    expect(resizeCrop(CROP, 't', 0, 0.1).t).toBeCloseTo(0.35)
    // Arrastrar el borde de abajo hacia abajo se come el recorte que había.
    expect(resizeCrop(CROP, 'b', 0, 0.1).b).toBeCloseTo(0)
  })

  it('una esquina mueve sus dos lados y solo esos', () => {
    const crop = resizeCrop(CROP, 'tl', 0.05, 0.05)
    expect(crop.l).toBeCloseTo(0.15)
    expect(crop.t).toBeCloseTo(0.3)
    expect(crop.r).toBe(CROP.r)
    expect(crop.b).toBe(CROP.b)
  })
})

describe('moveCrop', () => {
  it('no cambia el tamaño del rectángulo', () => {
    const crop = moveCrop(CROP, 0.05, -0.05)
    expect(crop.l + crop.r).toBeCloseTo(CROP.l + CROP.r)
    expect(crop.t + crop.b).toBeCloseTo(CROP.t + CROP.b)
    expect(crop.l).toBeCloseTo(0.15)
  })

  it('se para en el borde en vez de salirse', () => {
    expect(moveCrop(CROP, -1, 0).l).toBe(0)
    expect(moveCrop(CROP, 1, 0).r).toBe(0)
  })
})

describe('la ventana y la miniatura', () => {
  it('el rectángulo se dibuja donde dice el recorte', () => {
    expect(windowOf(CROP)).toEqual({ left: 10, top: 25, width: 70, height: 70 })
  })

  it('la imagen de dentro se agranda y se corre lo justo', () => {
    const estilo = thumbStyle({ l: 0.5, b: 0, r: 0, t: 0 })
    expect(estilo.width).toBe('200%')
    expect(estilo.left).toBe('-100%')
  })

  it('la ventana mide lo que queda de imagen, con el alto a tope', () => {
    // 1000×500 sin recortar, tope de 220 ⇒ 440×220.
    expect(thumbBox({ l: 0, b: 0, r: 0, t: 0 }, { width: 1000, height: 500 }, 220))
      .toEqual({ width: '440px', height: '220px' })
    // La mitad de ancho ⇒ la mitad de ancho en pantalla.
    expect(thumbBox({ l: 0.5, b: 0, r: 0, t: 0 }, { width: 1000, height: 500 }, 220))
      .toEqual({ width: '220px', height: '220px' })
  })

  it('sin tamaño natural todavía no hay ventana', () => {
    expect(thumbBox(CROP, { width: 0, height: 0 }, 220)).toBeNull()
  })
})

describe('setGraphicsOptions', () => {
  it('estrena los corchetes de una captura con el ancho que ponía la macro', () => {
    expect(setGraphicsOptions('', CROP, 'width=0.8\\linewidth'))
      .toBe('trim={0.1\\width} {0.05\\height} {0.2\\width} {0.25\\height}, clip, width=0.8\\linewidth')
  })

  it('un includegraphics sin corchetes no tiene ancho que rescatar', () => {
    expect(setGraphicsOptions('', CROP))
      .toBe('trim={0.1\\width} {0.05\\height} {0.2\\width} {0.25\\height}, clip')
  })

  it('respeta las opciones que ya había, incluso las que no enseña', () => {
    const salida = setGraphicsOptions('width=0.6\\linewidth, angle=90', CROP)
    expect(salida).toBe(
      'trim={0.1\\width} {0.05\\height} {0.2\\width} {0.25\\height}, clip, width=0.6\\linewidth, angle=90')
  })

  it('cambiar el recorte no duplica el trim ni el clip', () => {
    const primero = setGraphicsOptions('width=0.8\\linewidth', CROP)
    const segundo = setGraphicsOptions(primero, { l: 0, b: 0, r: 0.5, t: 0 })
    expect(segundo).toBe('trim={0\\width} {0\\height} {0.5\\width} {0\\height}, clip, width=0.8\\linewidth')
  })

  it('quitar el recorte de una captura devuelve el LaTeX de antes, sin corchetes', () => {
    const conRecorte = setGraphicsOptions('', CROP, 'width=0.8\\linewidth')
    expect(setGraphicsOptions(conRecorte, null, 'width=0.8\\linewidth')).toBe('')
  })

  it('quitar el recorte de un includegraphics deja el resto en su sitio', () => {
    const conRecorte = setGraphicsOptions('width=0.6\\linewidth', CROP)
    expect(setGraphicsOptions(conRecorte, null)).toBe('width=0.6\\linewidth')
  })

  it('un recorte que no recorta nada no se escribe', () => {
    expect(setGraphicsOptions('', { l: 0, b: 0, r: 0, t: 0 }, 'width=0.8\\linewidth')).toBe('')
    expect(isFullCrop(null)).toBe(true)
  })

  it('no parte por las comas que van dentro de una llave', () => {
    expect(cropOf('trim={0.1\\width} {0\\height} {0\\width} {0\\height}, clip')).toEqual(
      { l: 0.1, b: 0, r: 0, t: 0 })
    expect(setGraphicsOptions('trim={0.1\\width} {0\\height} {0\\width} {0\\height}, clip, width=1\\linewidth',
      null)).toBe('width=1\\linewidth')
  })
})
