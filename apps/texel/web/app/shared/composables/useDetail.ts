/**
 * Nivel de detalle de la interfaz — el «Reducir transparencia» de macOS.
 *
 * En «alto», `app.vue` enciende la lente de macvue (`data-macvue-glass="on"`) y
 * cada panel refracta el fondo con un filtro SVG: `feGaussianBlur` →
 * `feDisplacementMap` → … Es lo que hace que el cristal parezca cristal, y en
 * Chrome cuesta caro: un `backdrop-filter: url()` no se compone en la GPU, así
 * que el panel se repinta en el hilo principal y todo lo que scrollea dentro
 * —el PDF, el editor, el árbol— pierde el scroll fluido.
 *
 * En «bajo» los paneles vuelven al `backdrop-filter: blur()` nativo, se apagan
 * las animaciones del fondo y se quitan las sombras grandes. Sigue pareciendo
 * la misma app; deja de pintarse cuarenta veces por segundo.
 *
 * macvue ya respeta el ajuste del sistema (macOS → Accesibilidad → Pantalla →
 * Reducir transparencia) por su cuenta: esto es para poder elegirlo sin tocar
 * las preferencias del sistema.
 */

/** La versión va en la clave por lo mismo que en `usePanes`. */
const KEY = 'texel:detail:1'

export const DETAILS = [
  { id: 'alto', label: 'Alto', hint: 'cristal con refracción' },
  { id: 'bajo', label: 'Bajo', hint: 'sin lente; scroll más fluido' }
] as const

export type Detail = typeof DETAILS[number]['id']

const DEFAULT: Detail = 'alto'

const isDetail = (value: unknown): value is Detail =>
  DETAILS.some(d => d.id === value)

export function useDetail() {
  const current = useState<Detail>('texel-detail', () => DEFAULT)

  onMounted(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (isDetail(saved)) current.value = saved
    } catch { /* localStorage puede estar bloqueado; el valor por defecto sirve */ }
  })

  watch(current, (value) => {
    if (import.meta.client) localStorage.setItem(KEY, value)
  })

  return { current, options: DETAILS }
}
