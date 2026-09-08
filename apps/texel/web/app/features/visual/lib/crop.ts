/**
 * Recorte no destructivo de imágenes.
 *
 * El recorte **no toca el archivo**: es un parámetro que viaja en el propio
 * `.tex`, dentro de las opciones de `\includegraphics`, y que LaTeX aplica al
 * dibujar. El PNG del proyecto sigue entero en el bucket, así que quitar el
 * recorte devuelve la imagen original y volver a recortar siempre parte de ella
 * —lo mismo que hace Canva, y lo mismo que hacen los `.xmp` de Lightroom: fuente
 * inmutable, edición paramétrica encima.
 *
 * El parámetro es `trim={<izq> <abajo> <der> <arriba>}` más `clip`, con los
 * cuatro lados en fracciones de la imagen natural (`0.12\width`,
 * `0.05\height`). Las unidades relativas las aporta `adjustbox` con la opción
 * `export`, que `latex/tex/common/preamble.tex` carga justo después de
 * `graphicx`; sin ella `trim` solo admitiría longitudes absolutas, que no se
 * pueden calcular ni para un PDF ni para un PNG con `pHYs`.
 *
 * Aquí vive solo la aritmética, sin DOM: es lo que se puede probar.
 */

/**
 * Cuánto se quita de cada lado, en fracciones de 0 a 1 de la imagen entera.
 *
 * Los nombres son los de `trim` y en su mismo orden de lectura: `l`eft,
 * `b`ottom, `r`ight, `t`op. Un recorte válido cumple `l + r < 1` y `b + t < 1`.
 */
export interface Crop { l: number, b: number, r: number, t: number }

/** Recorte vacío: la imagen entera. */
export const FULL_CROP: Crop = { l: 0, b: 0, r: 0, t: 0 }

/** Lo mínimo que puede quedar de un lado, para que el rectángulo no desaparezca. */
export const MIN_SIDE = 0.02

/** Las ocho manijas del rectángulo, por los lados que mueve cada una. */
export type Handle = 'l' | 'r' | 't' | 'b' | 'tl' | 'tr' | 'bl' | 'br'

/** Ancho visible que deja el recorte, en fracción de la imagen entera. */
export function cropWidth(crop: Crop): number { return 1 - crop.l - crop.r }
/** Alto visible que deja el recorte. */
export function cropHeight(crop: Crop): number { return 1 - crop.t - crop.b }

/** ¿Esto es «la imagen entera», y por tanto no hay que escribir nada? */
export function isFullCrop(crop: Crop | null): boolean {
  if (!crop) return true
  return crop.l <= 0 && crop.b <= 0 && crop.r <= 0 && crop.t <= 0
}

/**
 * Deja el recorte dentro de lo posible: nada negativo, nada que se coma el lado
 * contrario. Se recorta el lado que se acaba de mover, no el de enfrente, porque
 * el de enfrente es el que el usuario dejó donde quería.
 */
export function clampCrop(crop: Crop): Crop {
  const l = Math.max(0, Math.min(crop.l, 1 - MIN_SIDE))
  const t = Math.max(0, Math.min(crop.t, 1 - MIN_SIDE))
  const r = Math.max(0, Math.min(crop.r, 1 - MIN_SIDE - l))
  const b = Math.max(0, Math.min(crop.b, 1 - MIN_SIDE - t))
  return { l, b, r, t }
}

/**
 * Mueve el rectángulo entero sin cambiarle el tamaño. `dx`/`dy` van en
 * fracciones de la imagen y en coordenadas de pantalla: `dy` positivo es hacia
 * abajo, así que suma a `t` y resta de `b`.
 */
export function moveCrop(crop: Crop, dx: number, dy: number): Crop {
  const x = Math.max(-crop.l, Math.min(dx, crop.r))
  const y = Math.max(-crop.t, Math.min(dy, crop.b))
  return { l: crop.l + x, r: crop.r - x, t: crop.t + y, b: crop.b - y }
}

/**
 * Arrastra una manija. Cada letra del nombre es un lado, así que una esquina es
 * las dos operaciones de sus dos lados, y no hace falta un caso por manija.
 */
export function resizeCrop(crop: Crop, handle: Handle, dx: number, dy: number): Crop {
  const next = { ...crop }
  if (handle.includes('l')) next.l = crop.l + dx
  if (handle.includes('r')) next.r = crop.r - dx
  if (handle.includes('t')) next.t = crop.t + dy
  if (handle.includes('b')) next.b = crop.b - dy
  return clampCrop(next)
}

/**
 * El rectángulo que hay que dibujar sobre la imagen **entera**, en porcentajes
 * desde arriba a la izquierda: es lo que pinta el overlay del diálogo.
 */
export function windowOf(crop: Crop): { left: number, top: number, width: number, height: number } {
  return {
    left: crop.l * 100,
    top: crop.t * 100,
    width: cropWidth(crop) * 100,
    height: cropHeight(crop) * 100
  }
}

/**
 * Cómo se pinta la imagen dentro de la ventana que la recorta: agrandada lo que
 * haga falta y corrida hacia arriba y hacia la izquierda, que es la forma de
 * recortar en CSS sin tocar el archivo —lo mismo que hace `trim`+`clip` en el
 * PDF, y por eso las dos vistas coinciden.
 *
 * El alto no se fija: se lo queda la proporción natural de la imagen. Así, si la
 * ventana acaba midiendo algo distinto de lo previsto —cabe menos de lo que se
 * pidió—, lo que se ve es un poco más o un poco menos de imagen, nunca una
 * imagen deformada.
 */
export function thumbStyle(crop: Crop): { width: string, left: string, top: string } {
  const w = cropWidth(crop)
  const h = cropHeight(crop)
  return {
    width: `${100 / w}%`,
    left: `${(-crop.l / w) * 100}%`,
    top: `${(-crop.t / h) * 100}%`
  }
}

/**
 * Lo que mide la ventana de la miniatura, en píxeles, para una imagen de este
 * tamaño natural. `max` es el alto máximo que se le deja ocupar.
 *
 * Va en píxeles y no en proporciones porque el recorte cambia la forma de la
 * caja: sin un tamaño calculado, un marco vacío —la imagen de dentro está fuera
 * del flujo— no tendría ninguno.
 */
export function thumbBox(
  crop: Crop,
  natural: { width: number, height: number },
  max: number
): { width: string, height: string } | null {
  if (!natural.width || !natural.height) return null
  const cw = natural.width * cropWidth(crop)
  const ch = natural.height * cropHeight(crop)
  if (!cw || !ch) return null
  const height = Math.min(max, ch)
  return { width: `${(cw / ch) * height}px`, height: `${height}px` }
}

const NUM = String.raw`([-+]?(?:[0-9]*\.)?[0-9]+)`
const SIDE = new RegExp(String.raw`^${NUM}\s*\\(width|height)$`)

/**
 * Lee el valor de un `trim={…}`. Devuelve `null` si no son cuatro medidas
 * relativas: un `trim` escrito a mano en centímetros es perfectamente válido en
 * LaTeX, pero no es algo que este editor sepa mover, y mentir sobre dónde está
 * el rectángulo sería peor que no ofrecerlo.
 */
export function parseCrop(value: string): Crop | null {
  const parts = value.trim().split(/\s+/)
  if (parts.length !== 4) return null
  const nums: number[] = []
  for (const part of parts) {
    const match = SIDE.exec(part)
    if (!match) return null
    nums.push(Number(match[1]))
  }
  const [l, b, r, t] = nums as [number, number, number, number]
  if (nums.some(n => !Number.isFinite(n) || n < 0)) return null
  if (l + r >= 1 || b + t >= 1) return null
  return { l, b, r, t }
}

/** Un lado, con los ceros de sobra quitados: `0.125\width`, `0\height`. */
function side(value: number, unit: 'width' | 'height'): string {
  const fixed = value.toFixed(4).replace(/\.?0+$/, '')
  return `${fixed || '0'}\\${unit}`
}

/** El valor que va dentro de `trim={…}`, en el orden izq-abajo-der-arriba. */
export function formatCrop(crop: Crop): string {
  return `${side(crop.l, 'width')} ${side(crop.b, 'height')} `
    + `${side(crop.r, 'width')} ${side(crop.t, 'height')}`
}

/**
 * Parte una lista de opciones de LaTeX por las comas de primer nivel. Las llaves
 * y los corchetes anidados no cuentan: `trim={a b c d}` y `borderline={…}{…}` son
 * una opción cada uno por mucha coma que lleven dentro.
 */
function splitOptions(options: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < options.length; i++) {
    const c = options[i]
    if (c === '\\') { i++; continue }
    if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') depth--
    else if (c === ',' && depth === 0) { parts.push(options.slice(start, i)); start = i + 1 }
  }
  parts.push(options.slice(start))
  return parts.map(p => p.trim()).filter(p => p.length > 0)
}

/** El `trim={…}` de una lista de opciones, ya leído. */
export function cropOf(options: string): Crop | null {
  for (const part of splitOptions(options)) {
    const match = /^trim\s*=\s*\{?([^}]*)\}?$/.exec(part)
    if (match) return parseCrop(match[1]!)
  }
  return null
}

/**
 * Reescribe las opciones de un `\includegraphics` con otro recorte, o sin
 * ninguno si `crop` es `null` o no recorta nada.
 *
 * Lo que no es el recorte no se toca: un `angle=90` o un `width=` que el editor
 * ni enseña siguen ahí, en su sitio y con su texto. Y `fallback` es lo que hay
 * que escribir cuando no había corchetes y hay que ponerlos —el ancho que la
 * macro daba por defecto—, porque estrenar el opcional sin él perdería el valor
 * que la clase ponía sola.
 *
 * Devuelve el contenido de los corchetes, sin corchetes; `''` significa «aquí no
 * va ningún corchete», que es lo que devuelve el documento a como estaba.
 */
export function setGraphicsOptions(
  options: string,
  crop: Crop | null,
  fallback = ''
): string {
  const had = options.trim().length > 0
  const rest = splitOptions(options)
    .filter(part => !/^trim\s*=/.test(part) && part !== 'clip')

  if (isFullCrop(crop)) {
    const kept = rest.join(', ')
    // Si lo único que queda es lo que la macro ya ponía sola, se quita el
    // corchete entero: el texto vuelve a ser exactamente el de antes de recortar.
    return kept === fallback.trim() ? '' : kept
  }

  if (!had && fallback.trim()) rest.push(fallback.trim())
  return [`trim={${formatCrop(crop!)}}`, 'clip', ...rest].join(', ')
}
