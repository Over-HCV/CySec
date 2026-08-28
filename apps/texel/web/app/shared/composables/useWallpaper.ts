/**
 * Fondo de la ventana.
 *
 * No es decoración: el cristal de los paneles refracta lo que tiene detrás, así
 * que un fondo liso lo vuelve invisible. Por eso el de salida es la imagen —
 * tiene franjas de alto contraste, que es justo lo que la lente puede doblar.
 * El fondo animado sigue disponible para quien lo prefiera, y el liso para
 * cuando estorba.
 */

/** La versión va en la clave por lo mismo que en `usePanes`. */
const KEY = 'texel:wallpaper:1'

export const WALLPAPERS = [
  { id: 'aurora', label: 'Aurora', hint: 'imagen; la que mejor luce el cristal' },
  { id: 'sky', label: 'Sky', hint: 'degradados animados, sin imagen' },
  { id: 'aqua', label: 'Aqua', hint: 'vídeo de piscina a cámara lenta' },
  { id: 'liso', label: 'Liso', hint: 'color plano, sin distracción' }
] as const

export type Wallpaper = typeof WALLPAPERS[number]['id']

const DEFAULT: Wallpaper = 'aurora'

const isWallpaper = (value: unknown): value is Wallpaper =>
  WALLPAPERS.some(w => w.id === value)

export function useWallpaper() {
  const current = useState<Wallpaper>('texel-wallpaper', () => DEFAULT)

  onMounted(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (isWallpaper(saved)) current.value = saved
    } catch { /* localStorage puede estar bloqueado; el valor por defecto sirve */ }
  })

  watch(current, (value) => {
    if (import.meta.client) localStorage.setItem(KEY, value)
  })

  return { current, options: WALLPAPERS }
}
