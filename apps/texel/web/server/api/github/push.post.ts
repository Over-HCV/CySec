/** Sube al repositorio lo que cambió aquí, en un commit. */
import { requireProject } from '../../utils/gh/guard'
import { computeStatus, loadLink, push } from '../../utils/gh/sync'

interface Body {
  projectId: string
  message?: string
  /** Rutas en conflicto que se resuelven a favor del proyecto. */
  force?: string[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  const caller = await requireProject(event, body.projectId, 'editor')

  const link = await loadLink(caller.admin, body.projectId)
  const snapshots = await computeStatus(caller.admin, link)

  const { data: project } = await caller.admin
    .from('projects').select('name').eq('id', body.projectId).maybeSingle()
  const message = body.message?.trim() || `texel: ${project?.name ?? 'sincronización'}`

  return push(caller.admin, link, snapshots, message, body.force ?? [])
})
