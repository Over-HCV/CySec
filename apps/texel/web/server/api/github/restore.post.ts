/** Descarta cambios locales de unas rutas, dejándolas como están en el repo. */
import { requireProject } from '../../utils/gh/guard'
import { computeStatus, loadLink, restore } from '../../utils/gh/sync'

interface Body {
  projectId: string
  /** Rutas del proyecto cuyo cambio local se descarta. */
  paths: string[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  const caller = await requireProject(event, body.projectId, 'editor')

  if (!Array.isArray(body.paths) || !body.paths.length) {
    throw createError({ statusCode: 400, statusMessage: 'no se indicó qué rutas restaurar' })
  }

  const link = await loadLink(caller.admin, body.projectId)
  const snapshots = await computeStatus(caller.admin, link)

  return restore(caller.admin, link, snapshots, body.paths)
})
