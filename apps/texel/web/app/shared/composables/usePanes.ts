/**
 * Estado del layout del editor: anchos de los paneles, alto del panel de log y
 * qué está plegado. Se guarda en localStorage para que la ventana vuelva como
 * la dejaste.
 */
/**
 * La versión va en la clave: al cambiar los valores por defecto, lo guardado en
 * el navegador los pisaría y el cambio no se notaría en las máquinas que ya
 * habían abierto la app. El precio es olvidar una vez los anchos de panel.
 */
const KEY = 'texel:panes:3'

/**
 * Lo que **no** se recuerda entre sesiones: cómo se abre un proyecto es una
 * decisión del producto, no una preferencia. Abrir siempre en Visual y con el
 * árbol plegado; si en esta sesión te vas a Código o abres el árbol, se queda
 * así hasta que recargues, y punto.
 */
const PER_SESSION = ['editorTab', 'sidebarOpen'] as const

interface LayoutState {
  sidebarWidth: number
  editorRatio: number      // 0–1 del espacio restante que ocupa el editor
  logHeight: number
  sidebarOpen: boolean
  pdfOpen: boolean
  logOpen: boolean
  wrap: boolean            // ajuste de línea en el editor
  editorTab: 'code' | 'visual'   // pestaña activa del panel del editor
  autoCompile: boolean     // compilar sola al dejar de escribir
  compileMode: CompileMode // profundidad de la compilación
}

/**
 * `fast` es una pasada de LaTeX y sin bibliografía: sirve para mirar el
 * resultado mientras se escribe, no para entregar.
 */
export type CompileMode = 'normal' | 'fast'

const DEFAULTS: LayoutState = {
  sidebarWidth: 230,
  editorRatio: 0.5,
  logHeight: 180,
  // El árbol de archivos se abre cuando hace falta; de salida estorba más de lo
  // que aporta, sobre todo con un proyecto de un solo archivo.
  sidebarOpen: false,
  pdfOpen: true,
  logOpen: true,
  wrap: true,
  // La vista por bloques es la que puede usar quien no escribe LaTeX, que es
  // para quien se hizo. El código sigue a un clic.
  editorTab: 'visual',
  // Compilar cuesta CPU y cada compilación queda en la tabla: se activa a mano,
  // como en Overleaf. El modo se recuerda entre sesiones, la pestaña no.
  autoCompile: false,
  compileMode: 'normal'
}

export const LIMITS = {
  sidebar: { min: 160, max: 420 },
  ratio: { min: 0.2, max: 0.8 },
  log: { min: 90, max: 460 }
}

export function usePanes() {
  const state = useState<LayoutState>('texel-panes', () => ({ ...DEFAULTS }))

  onMounted(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Partial<LayoutState>
      for (const key of PER_SESSION) delete saved[key]
      Object.assign(state.value, saved)
    } catch { /* localStorage puede estar bloqueado; los valores por defecto sirven */ }
  })

  // Con retardo: arrastrar un divisor muta el estado en cada `pointermove`, y
  // `JSON.stringify` + `localStorage.setItem` son síncronos y bloquean el hilo
  // que en ese momento está redibujando los dos paneles. Lo que importa es que
  // quede guardado al soltar, no cuarenta veces por segundo.
  let pending: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (!pending) return
    clearTimeout(pending)
    pending = null
    localStorage.setItem(KEY, JSON.stringify(state.value))
  }

  watch(state, () => {
    if (!import.meta.client) return
    if (pending) clearTimeout(pending)
    pending = setTimeout(flush, 300)
  }, { deep: true })

  // Cerrar la pestaña justo después de mover un divisor no puede perderlo.
  onMounted(() => window.addEventListener('pagehide', flush))
  onBeforeUnmount(() => { window.removeEventListener('pagehide', flush); flush() })

  const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

  return {
    state,
    setSidebarWidth: (px: number) => {
      state.value.sidebarWidth = clamp(px, LIMITS.sidebar.min, LIMITS.sidebar.max)
    },
    setEditorRatio: (ratio: number) => {
      state.value.editorRatio = clamp(ratio, LIMITS.ratio.min, LIMITS.ratio.max)
    },
    setLogHeight: (px: number) => {
      state.value.logHeight = clamp(px, LIMITS.log.min, LIMITS.log.max)
    },
    reset: () => { state.value = { ...DEFAULTS } }
  }
}
