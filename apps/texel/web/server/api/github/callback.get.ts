/**
 * Setup URL: vuelta de instalar la App.
 *
 * GitHub manda aquí con `installation_id` y, si la ida llevaba `state`, con el
 * proyecto desde el que se salió, que es a donde se devuelve a la persona. El
 * `state` de este camino **no va firmado** —lo produce el enlace de instalación
 * de GitHub, no nosotros—, así que solo se usa para elegir a dónde volver, y se
 * comprueba que sea un proyecto del que quien vuelve es miembro.
 */
import { appClient } from '../../utils/gh/app'
import { requireUser } from '../../utils/gh/guard'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const installationId = Number(query.installation_id)
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

  // Acaba de instalarla: tiene acceso por definición, sin necesidad de pasar
  // por el inicio de sesión con GitHub.
  const { error: linkError } = await caller.admin.from('github_installation_users').upsert({
    installation_id: installationId,
    user_id: caller.userId
  })
  if (linkError) throw createError({ statusCode: 500, statusMessage: linkError.message })

  return sendRedirect(event, await backTo(caller, String(query.state ?? '')))
})

/** Al proyecto de donde salió, si sigue siendo suyo; si no, a la lista. */
async function backTo(
  caller: Awaited<ReturnType<typeof requireUser>>,
  projectId: string
): Promise<string> {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return '/?github=ok'

  const { data } = await caller.admin
    .from('project_members').select('project_id')
    .eq('project_id', projectId).eq('user_id', caller.userId).maybeSingle()

  return data ? `/p/${projectId}?github=ok` : '/?github=ok'
}
