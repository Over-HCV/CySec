/** Deshace el enlace. No toca ni el proyecto ni el repositorio. */
import { requireProject } from '../../utils/gh/guard'

export default defineEventHandler(async (event) => {
  const projectId = String(getQuery(event).projectId ?? '')
  const caller = await requireProject(event, projectId, 'owner')

  const { error } = await caller.admin.from('project_repos').delete().eq('project_id', projectId)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const { error: baseError } = await caller.admin
    .from('project_repo_files').delete().eq('project_id', projectId)
  if (baseError) throw createError({ statusCode: 500, statusMessage: baseError.message })

  return { ok: true }
})
