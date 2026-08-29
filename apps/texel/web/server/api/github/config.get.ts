/**
 * Estado de GitHub para esta persona: si la App está puesta, si puede iniciar
 * sesión con GitHub y con qué cuenta lo hizo. Es lo que decide qué enseña el
 * diálogo antes de tocar nada.
 */
import { appConfig, installUrl, oauthConfig } from '../../utils/gh/app'
import { requireUser } from '../../utils/gh/guard'

export default defineEventHandler(async (event) => {
  const config = appConfig()
  if (!config) return { configured: false, canSignIn: false, identity: null, installUrl: null }

  const projectId = String(getQuery(event).projectId ?? '')
  const caller = await requireUser(event)

  const { data } = await caller.admin
    .from('github_identities').select('login, avatar_url')
    .eq('user_id', caller.userId).maybeSingle()

  return {
    configured: true,
    canSignIn: oauthConfig(config) !== null,
    identity: data ?? null,
    installUrl: installUrl(projectId || undefined, config)
  }
})
