/**
 * Ida del «iniciar sesión con GitHub».
 *
 * No se pide para tocar repositorios —de eso se encarga la App con su clave—
 * sino para saber *de quién* es cada instalación: quien vuelve de aquí trae la
 * prueba, dada por GitHub, de a qué instalaciones alcanza.
 */
import { oauthConfig, requireAppConfig } from '../../../utils/gh/app'
import { signState } from '../../../utils/gh/state'
import { requireProject } from '../../../utils/gh/guard'

/** Nombre de la cookie que guarda el nonce mientras dura el viaje. */
export const STATE_COOKIE = 'texel_gh_state'

export default defineEventHandler(async (event) => {
  const projectId = String(getQuery(event).projectId ?? '')
  // Se exige ser dueño antes de salir: si no, cualquiera podría iniciar el
  // baile con el id de un proyecto ajeno y volver enlazándolo.
  await requireProject(event, projectId, 'owner')

  const config = requireAppConfig()
  const oauth = oauthConfig(config)
  if (!oauth) {
    throw createError({
      statusCode: 501,
      statusMessage: 'la GitHub App no tiene secreto de cliente: falta GITHUB_CLIENT_ID o GITHUB_CLIENT_SECRET'
    })
  }

  const { state, nonce } = signState(projectId, oauth.clientSecret)

  // El nonce se queda aquí y la firma se va a GitHub: una vuelta solo vale si
  // trae las dos mitades, así que un enlace copiado a otro navegador no sirve.
  setCookie(event, STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: 'lax',   // 'strict' no sobreviviría a la redirección desde github.com
    secure: getRequestURL(event).protocol === 'https:',
    path: '/api/github',
    maxAge: 600
  })

  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', oauth.clientId)
  url.searchParams.set('state', state)
  // Se deduce de la propia petición: así vale igual en local, en una preview y
  // en producción sin una variable más que mantener a mano.
  url.searchParams.set('redirect_uri', new URL('/api/github/oauth/callback', getRequestURL(event)).toString())

  return sendRedirect(event, url.toString())
})
