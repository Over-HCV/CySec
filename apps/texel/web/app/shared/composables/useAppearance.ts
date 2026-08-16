/**
 * Apariencia de la interfaz: clara, oscura o la del sistema.
 *
 * La preferencia se guarda aparte del fondo (`useWallpaper`) porque son cosas
 * distintas: el fondo es decoración, la apariencia decide el color de cada
 * panel y de cada texto. `plugins/appearance.client.ts` la refleja en `<html>`
 * (`data-theme` para nuestras CSS, `data-macvue-appearance` para macvue).
 */

/** La versión va en la clave por lo mismo que en `usePanes`. */
const KEY = 'texel:appearance:1'

export const APPEARANCES = [
  { id: 'system', label: 'Sistema', hint: 'claro u oscuro según macOS' },
  { id: 'light', label: 'Claro', hint: 'siempre claro' },
  { id: 'dark', label: 'Oscuro', hint: 'siempre oscuro' }
] as const

export type Appearance = typeof APPEARANCES[number]['id']

const DEFAULT: Appearance = 'system'

const isAppearance = (value: unknown): value is Appearance =>
  APPEARANCES.some(a => a.id === value)

export function useAppearance() {
  const current = useState<Appearance>('texel-appearance', () => DEFAULT)

  onMounted(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (isAppearance(saved)) current.value = saved
    } catch { /* localStorage puede estar bloqueado; el valor por defecto sirve */ }
  })

  watch(current, (value) => {
    if (import.meta.client) localStorage.setItem(KEY, value)
  })

  return { current, options: APPEARANCES }
}
