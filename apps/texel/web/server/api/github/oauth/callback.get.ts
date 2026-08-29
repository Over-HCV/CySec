/**
 * Vuelta del «iniciar sesión con GitHub».
 *
 * Se canjea el código, se pregunta quién es y a qué instalaciones alcanza, y se
 * apunta **solo eso**. El token muere aquí: no se guarda ni se refresca, porque
 * lo único que hacía falta era la prueba de acceso, y todo lo demás lo firma la
 * App con su clave privada.
 */
import { oauthConfig, requireAppConfig } from '../../../utils/gh/app'
import { requireUser } from '../../../utils/gh/guard'
import { verifyState } from '../../../utils/gh/state'
import { STATE_COOKIE } from './start.get'

interface TokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

interface GithubUser {
  login: string
  avatar_url?: string
}

interface InstallationList {
  installations: {
    id: number
    account: { login?: string, slug?: string } | null
  }[]
}

export default defineEventHandler(async (event) => {
  const config = requireAppConfig()
  const oauth = oauthConfig(config)
  if (!oauth) throw createError({ statusCode: 501, statusMessage: 'falta el secreto de cliente de la App' })

  const caller = await requireUser(event)
  const query = getQuery(event)

  const nonce = getCookie(event, STATE_COOKIE)
  deleteCookie(event, STATE_COOKIE, { path: '/api/github' })

  const state = verifyState(String(query.state ?? ''), oauth.clientSecret, nonce)
  if (!state) throw createError({ statusCode: 400, statusMessage: 'la vuelta de GitHub no cuadra con la ida' })

  const code = String(query.code ?? '')
  if (!code) throw createError({ statusCode: 400, statusMessage: 'GitHub no devolvió ningún código' })

  const token = await $fetch<TokenResponse>('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json' },
    body: {
      client_id: oauth.clientId,
      client_secret: oauth.clientSecret,
      code,
      redirect_uri: new URL('/api/github/oauth/callback', getRequestURL(event)).toString()
    }
  })

  if (!token.access_token) {
    throw createError({
      statusCode: 502,
      statusMessage: `GitHub rechazó el código: ${token.error_description ?? token.error ?? 'sin motivo'}`
    })
  }

  const headers = {
    authorization: `Bearer ${token.access_token}`,
    accept: 'application/vnd.github+json'
  }

  const user = await $fetch<GithubUser>('https://api.github.com/user', { headers })
  const { installations } = await $fetch<InstallationList>(
    'https://api.github.com/user/installations?per_page=100',
    { headers }
  )

  const { error: identityError } = await caller.admin.from('github_identities').upsert({
    user_id: caller.userId,
    login: user.login,
    avatar_url: user.avatar_url ?? null,
    updated_at: new Date().toISOString()
  })
  if (identityError) throw createError({ statusCode: 500, statusMessage: identityError.message })

  for (const installation of installations) {
    const account = installation.account
    const { error: rowError } = await caller.admin.from('github_installations').upsert({
      id: installation.id,
      account_login: account?.login ?? account?.slug ?? 'desconocida'
    })
    if (rowError) throw createError({ statusCode: 500, statusMessage: rowError.message })

    const { error: linkError } = await caller.admin.from('github_installation_users').upsert({
      installation_id: installation.id,
      user_id: caller.userId
    })
    if (linkError) throw createError({ statusCode: 500, statusMessage: linkError.message })
  }

  // Lo que ya no aparece en GitHub deja de estar a su alcance aquí: si alguien
  // revoca el acceso, revocado queda.
  const vigentes = installations.map(i => i.id)
  const stale = caller.admin.from('github_installation_users').delete().eq('user_id', caller.userId)
  const { error: cleanupError } = vigentes.length
    ? await stale.not('installation_id', 'in', `(${vigentes.join(',')})`)
    : await stale
  if (cleanupError) throw createError({ statusCode: 500, statusMessage: cleanupError.message })

  return sendRedirect(event, `/p/${state.projectId}?github=ok`)
})
