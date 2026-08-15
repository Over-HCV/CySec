/**
 * Estado del layout del editor: anchos de los paneles, alto del panel de log y
 * qué está plegado. Se guarda en localStorage para que la ventana vuelva como
 * la dejaste.
 */
const KEY = 'texel:panes'

interface LayoutState {
  sidebarWidth: number
  editorRatio: number      // 0–1 del espacio restante que ocupa el editor
  logHeight: number
  sidebarOpen: boolean
  pdfOpen: boolean
  logOpen: boolean
  wrap: boolean            // ajuste de línea en el editor
}

const DEFAULTS: LayoutState = {
  sidebarWidth: 230,
  editorRatio: 0.5,
  logHeight: 180,
  sidebarOpen: true,
  pdfOpen: true,
  logOpen: true,
  wrap: true
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
      if (raw) Object.assign(state.value, JSON.parse(raw) as Partial<LayoutState>)
    } catch { /* localStorage puede estar bloqueado; los valores por defecto sirven */ }
  })

  watch(state, (value) => {
    if (import.meta.client) localStorage.setItem(KEY, JSON.stringify(value))
  }, { deep: true })

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
