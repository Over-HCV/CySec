import { CROP_CLASS_FILES, soportaRecorte } from '../lib/class-support'
import { TEMPLATE_FILES } from '~/features/projects/lib/template.generated'

/**
 * ¿La clase LaTeX de este proyecto entiende el recorte de imágenes?
 *
 * Un proyecto se lleva su copia de `tex/common/*.tex` el día que nace y nadie
 * se la vuelve a tocar, así que la plantilla puede ir por delante. Escribir un
 * `\captura[…]{…}{…}` contra la versión vieja de la macro no da un aviso: deja
 * el taller sin compilar. Se mira antes de ofrecer el botón.
 *
 * Es una consulta suelta y no `useProjectFiles` a propósito: aquí solo hacen
 * falta dos archivos y una vez, y esa otra abre un canal de Realtime que la
 * página ya tiene abierto.
 */
export function useClassSupport(projectId: MaybeRefOrGetter<string | undefined>) {
  const supabase = useSupabaseClient()
  /** Fila de cada archivo de la clase, o `null` si el proyecto no lo tiene. */
  const clase = ref<Record<string, { id: string, content: string } | null>>({})
  const cargado = ref(false)
  const actualizando = ref(false)

  const soporta = computed(() => cargado.value && soportaRecorte(
    clase.value[CROP_CLASS_FILES[0]!]?.content ?? null,
    clase.value[CROP_CLASS_FILES[1]!]?.content ?? null
  ))

  /** ¿Tiene sentido ofrecer «actualizar»? Solo si están los dos archivos. */
  const actualizable = computed(() =>
    cargado.value && !soporta.value
    && CROP_CLASS_FILES.every(path => clase.value[path]))

  async function refresh() {
    const id = toValue(projectId)
    if (!id) { cargado.value = false; return }
    const { data, error } = await supabase
      .from('files')
      .select('id, path, content')
      .eq('project_id', id)
      .in('path', CROP_CLASS_FILES)
    if (error) return
    const next: Record<string, { id: string, content: string } | null> = {}
    for (const path of CROP_CLASS_FILES) {
      const row = (data ?? []).find(f => (f as { path: string }).path === path) as
        { id: string, content: string | null } | undefined
      next[path] = row ? { id: row.id, content: row.content ?? '' } : null
    }
    clase.value = next
    cargado.value = true
  }

  /**
   * Pone al día los dos archivos de la clase desde la plantilla.
   *
   * Solo esos dos, y solo cuando alguien lo pide a mano: son archivos del
   * proyecto y alguien pudo haberlos retocado. El resto de la capa compartida
   * se queda como está.
   */
  async function actualizar() {
    actualizando.value = true
    try {
      for (const path of CROP_CLASS_FILES) {
        const fila = clase.value[path]
        const contenido = TEMPLATE_FILES[path]
        if (!fila || contenido === undefined || fila.content === contenido) continue
        const { error } = await supabase
          .from('files')
          .update({ content: contenido, size_bytes: new Blob([contenido]).size })
          .eq('id', fila.id)
        if (error) throw error
      }
      await refresh()
    } finally {
      actualizando.value = false
    }
  }

  watch(() => toValue(projectId), () => { void refresh() }, { immediate: true })

  return { soporta, actualizable, actualizando, actualizar, refresh }
}
