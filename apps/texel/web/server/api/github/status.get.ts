/**
 * Qué pasaría al sincronizar: lo que hay por subir, por bajar y en conflicto.
 *
 * Es la misma comparación que ejecutan traer y subir, así que lo que se enseña
 * antes de pulsar es exactamente lo que va a ocurrir.
 */
import { requireProject } from '../../utils/gh/guard'
import { computeStatus, loadLink } from '../../utils/gh/sync'

export default defineEventHandler(async (event) => {
  const projectId = String(getQuery(event).projectId ?? '')
  const caller = await requireProject(event, projectId, 'viewer')

  const link = await loadLink(caller.admin, projectId)
  const { report } = await computeStatus(caller.admin, link)

  return {
    repo: `${link.owner}/${link.repo}`,
    branch: link.branch,
    lastSyncedAt: link.last_synced_at,
    ...report
  }
})
