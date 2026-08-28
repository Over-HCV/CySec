/**
 * Vuelta de la instalación de la App.
 *
 * GitHub redirige aquí con `installation_id`. Se guarda a nombre de quien tiene
 * la sesión abierta —es lo único que ata una instalación a un usuario de
 * Texel— y se devuelve a la lista de proyectos.
 */
import { appClient } from '../../utils/gh/app'
import { requireUser } from '../../utils/gh/guard'

export default defineEventHandler(async (event) => {
  const { installation_id: raw } = getQuery(event)
  const installationId = Number(raw)
  if (!installationId) throw createError({ statusCode: 400, statusMessage: 'falta installation_id' })

  const caller = await requireUser(event)
  const { data } = await appClient().apps.getInstallation({ installation_id: installationId })
  const account = data.account as { login?: string, slug?: string } | null

  const { error } = await caller.admin.from('github_installations').upsert({
    id: installationId,
    user_id: caller.userId,
    account_login: account?.login ?? account?.slug ?? 'desconocida'
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return sendRedirect(event, '/?github=instalada')
})
