import type { Project, ProjectRole, ProjectMember, Profile, TexEngine } from '~/shared/types/database'

/** Lista de proyectos donde el usuario es miembro (el RLS ya filtra). */
export function useProjects() {
  const supabase = useSupabaseClient()
  const projects = ref<Project[]>([])
  const pending = ref(false)

  async function refresh() {
    pending.value = true
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
    pending.value = false
    if (error) throw error
    projects.value = (data ?? []) as Project[]
  }

  /** RPC: crea proyecto + membresía de dueño + main.tex en una transacción. */
  async function create(name: string, engine: TexEngine = 'xelatex') {
    const { data, error } = await supabase.rpc('create_project', { p_name: name, p_engine: engine })
    if (error) throw error
    await refresh()
    return data as string
  }

  async function remove(id: string) {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
    projects.value = projects.value.filter(p => p.id !== id)
  }

  return { projects, pending, refresh, create, remove }
}

/** Miembros de un proyecto, con su perfil, y gestión de invitaciones. */
export function useProjectMembers(projectId: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()
  const members = ref<(ProjectMember & { profile: Profile })[]>([])
  const myRole = ref<ProjectRole | null>(null)
  const user = useSupabaseUser()

  async function refresh() {
    const { data, error } = await supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .eq('project_id', toValue(projectId))
    if (error) throw error
    members.value = (data ?? []) as never
    myRole.value = members.value.find(m => m.user_id === user.value?.id)?.role ?? null
  }

  /** Crea una invitación y devuelve el enlace para compartir. */
  async function invite(role: ProjectRole = 'editor', email?: string) {
    const { data, error } = await supabase
      .from('project_invites')
      .insert({
        project_id: toValue(projectId),
        role,
        email: email || null,
        created_by: user.value!.id
      })
      .select('token')
      .single()
    if (error) throw error
    return `${window.location.origin}/invite/${data.token}`
  }

  async function setRole(userId: string, role: ProjectRole) {
    const { error } = await supabase
      .from('project_members')
      .update({ role })
      .eq('project_id', toValue(projectId))
      .eq('user_id', userId)
    if (error) throw error
    await refresh()
  }

  async function removeMember(userId: string) {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', toValue(projectId))
      .eq('user_id', userId)
    if (error) throw error
    await refresh()
  }

  const canWrite = computed(() => myRole.value === 'editor' || myRole.value === 'owner')
  const isOwner = computed(() => myRole.value === 'owner')

  return { members, myRole, canWrite, isOwner, refresh, invite, setRole, removeMember }
}
