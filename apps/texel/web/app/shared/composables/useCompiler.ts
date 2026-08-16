import type { Compilation, Diagnostic } from '~/shared/types/database'
import type { CompileMode } from '~/shared/composables/usePanes'

interface SyncTexArea { page: number, x: number, y: number, w: number, h: number }
interface SyncTexSource { file: string, line: number }

/**
 * Cliente del servicio de compilación (Cloud Run).
 *
 * El servicio valida el JWT de Supabase y comprueba la pertenencia al proyecto
 * antes de tocar nada, así que aquí basta con adjuntar el token de la sesión.
 */
export function useCompiler(projectId: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()
  const config = useRuntimeConfig()
  const base = config.public.compilerUrl

  const compiling = ref(false)
  const last = ref<Compilation | null>(null)
  const pdfUrl = ref<string | null>(null)

  async function authHeaders() {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('sesión no iniciada')
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
    return res.json() as Promise<T>
  }

  /**
   * `mode` viaja al servicio: `fast` es una pasada y sin bibliografía, para
   * mirar mientras se escribe. Un servicio viejo que no lo conozca compila
   * normal, que es lo que hacía antes.
   */
  async function compile(mode: CompileMode = 'normal') {
    compiling.value = true
    try {
      const result = await post<Compilation>('/compile', { projectId: toValue(projectId), mode })
      last.value = result
      if (result.pdf_path) await loadPdf(result.pdf_path)
      return result
    } finally {
      compiling.value = false
    }
  }

  /** URL firmada del PDF: el bucket `compiled` es privado. */
  async function loadPdf(path: string) {
    const { data, error } = await supabase.storage.from('compiled').createSignedUrl(path, 3600)
    if (error) throw error
    pdfUrl.value = data.signedUrl
  }

  /** Editor → PDF. */
  function forward(file: string, line: number) {
    return post<SyncTexArea | null>('/synctex/forward', {
      projectId: toValue(projectId),
      compilationId: last.value?.id,
      file,
      line
    })
  }

  /** PDF → editor. */
  function inverse(page: number, x: number, y: number) {
    return post<SyncTexSource | null>('/synctex/inverse', {
      projectId: toValue(projectId),
      compilationId: last.value?.id,
      page,
      x,
      y
    })
  }

  /** Última compilación conocida, para que al abrir el proyecto ya haya PDF. */
  async function loadLast() {
    const { data } = await supabase
      .from('compilations')
      .select('*')
      .eq('project_id', toValue(projectId))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) {
      last.value = data as Compilation
      if (data.pdf_path) await loadPdf(data.pdf_path)
    }
  }

  return { compiling, last, pdfUrl, compile, forward, inverse, loadLast }
}

export type { Diagnostic, SyncTexArea, SyncTexSource }
