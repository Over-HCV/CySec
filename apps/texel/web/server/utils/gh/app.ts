/**
 * Cliente de GitHub para la App de Texel.
 *
 * La App no guarda tokens: se acuñan en cada petición a partir del id de la
 * instalación y de la clave privada, y caducan en una hora. Así, revocar el
 * acceso es desinstalar la App —no hay nada que borrar de la base— y una fuga
 * de la base de datos no da acceso a ningún repositorio.
 */
import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'

export interface AppConfig {
  appId: string
  privateKey: string
  /** Nombre corto de la App en su URL: github.com/apps/<slug>. */
  slug: string
  /** Credenciales de «iniciar sesión con GitHub». Sin ellas no hay identidad. */
  clientId: string | null
  clientSecret: string | null
}

/**
 * Configuración de la App, o `null` si no está puesta. Se devuelve `null` en
 * vez de reventar para que la interfaz pueda decir «falta configurar GitHub» en
 * vez de dar un 500 sin explicación.
 */
export function appConfig(): AppConfig | null {
  const appId = process.env.GITHUB_APP_ID
  const slug = process.env.GITHUB_APP_SLUG
  // En un `.env` la clave viaja en una sola línea con `\n` escapados; en Secret
  // Manager y en Vercel viaja con saltos de verdad. Se admiten las dos.
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!appId || !privateKey || !slug) return null
  return {
    appId,
    privateKey,
    slug,
    clientId: process.env.GITHUB_CLIENT_ID ?? null,
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? null
  }
}

export function requireAppConfig(): AppConfig {
  const config = appConfig()
  if (!config) {
    throw createError({
      statusCode: 501,
      statusMessage: 'GitHub sin configurar: faltan GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY o GITHUB_APP_SLUG'
    })
  }
  return config
}

/** Octokit autenticado como la App: solo sirve para mirar sus instalaciones. */
export function appClient(config = requireAppConfig()): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: config.appId, privateKey: config.privateKey }
  })
}

/** Octokit autenticado como una instalación: es el que toca repositorios. */
export function installationClient(installationId: number, config = requireAppConfig()): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: config.appId, privateKey: config.privateKey, installationId }
  })
}

/**
 * URL donde el usuario instala la App o revisa a qué repos le dio acceso.
 *
 * `state` viaja hasta el Setup URL y vuelve: es lo que permite devolver a la
 * persona al proyecto desde el que salió, en vez de dejarla en la lista
 * buscando dónde estaba.
 */
export function installUrl(projectId?: string, config = requireAppConfig()): string {
  const base = `https://github.com/apps/${config.slug}/installations/new`
  return projectId ? `${base}?state=${encodeURIComponent(projectId)}` : base
}

/**
 * Credenciales de OAuth, o `null` si la App se creó sin secreto de cliente.
 * Entonces la sincronización sigue funcionando —la App se autentica sola— pero
 * no se puede saber *de quién* es cada instalación.
 */
export function oauthConfig(config = requireAppConfig()): { clientId: string, clientSecret: string } | null {
  if (!config.clientId || !config.clientSecret) return null
  return { clientId: config.clientId, clientSecret: config.clientSecret }
}
