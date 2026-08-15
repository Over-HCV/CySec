import type { ProjectFile } from '~/shared/types/database'

/**
 * Árbol de archivos de un proyecto, sincronizado por Realtime: si un
 * colaborador crea o borra un archivo, el resto lo ve sin recargar.
 */
export function useProjectFiles(projectId: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const files = ref<ProjectFile[]>([])

  async function refresh() {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', toValue(projectId))
      .order('path')
    if (error) throw error
    files.value = (data ?? []) as ProjectFile[]
  }

  async function create(path: string, content = '') {
    const { data, error } = await supabase
      .from('files')
      .insert({
        project_id: toValue(projectId),
        path,
        kind: 'text',
        content,
        updated_by: user.value?.id
      })
      .select()
      .single()
    if (error) throw error
    return data as ProjectFile
  }

  async function remove(file: ProjectFile) {
    const { error } = await supabase.from('files').delete().eq('id', file.id)
    if (error) throw error
  }

  /** Vuelca el texto del documento Yjs a `files.content` (lo que lee el compilador). */
  async function saveContent(fileId: string, content: string) {
    const { error } = await supabase
      .from('files')
      .update({ content, size_bytes: new Blob([content]).size, updated_by: user.value?.id })
      .eq('id', fileId)
    if (error) throw error
  }

  let channel: ReturnType<typeof supabase.channel> | null = null

  onMounted(() => {
    channel = supabase
      .channel(`files:${toValue(projectId)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files', filter: `project_id=eq.${toValue(projectId)}` },
        () => { void refresh() }
      )
      .subscribe()
  })

  onBeforeUnmount(() => {
    if (channel) void supabase.removeChannel(channel)
  })

  return { files, refresh, create, remove, saveContent }
}
