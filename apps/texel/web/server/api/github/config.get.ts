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

  // El error no se descarta: comérselo fue lo que hizo que esta ruta contestara
  // 200 con `identity: null` mientras la base rechazaba la consulta, y el fallo
  // apareciera dos pantallas más allá.
  const { data, error } = await caller.admin
    .from('github_identities').select('login, avatar_url')
    .eq('user_id', caller.userId).maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    configured: true,
    canSignIn: oauthConfig(config) !== null,
    identity: data ?? null,
    installUrl: installUrl(projectId || undefined, config)
  }
})
