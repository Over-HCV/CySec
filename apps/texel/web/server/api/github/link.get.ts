/** El enlace del proyecto, si lo hay. `null` en vez de 404: la interfaz pregunta siempre. */
import { requireProject } from '../../utils/gh/guard'

export default defineEventHandler(async (event) => {
  const projectId = String(getQuery(event).projectId ?? '')
  const caller = await requireProject(event, projectId, 'viewer')

  const { data, error } = await caller.admin
    .from('project_repos').select('*').eq('project_id', projectId).maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
