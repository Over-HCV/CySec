/** Trae del repositorio lo que cambió allí. */
import { requireProject } from '../../utils/gh/guard'
import { computeStatus, loadLink, pull } from '../../utils/gh/sync'

interface Body {
  projectId: string
  /** Rutas en conflicto que se resuelven a favor del repositorio. */
  force?: string[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  const caller = await requireProject(event, body.projectId, 'editor')

  const link = await loadLink(caller.admin, body.projectId)
  const snapshots = await computeStatus(caller.admin, link)
  return pull(caller.admin, link, snapshots, body.force ?? [])
})
