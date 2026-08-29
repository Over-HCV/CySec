/**
 * Cliente del enlace con GitHub.
 *
 * Todo pasa por rutas del propio servidor (`/api/github/*`) y no por la API de
 * GitHub desde el navegador: la clave privada de la App no puede salir del
 * servidor, y la sesión de Supabase ya viaja en la cookie, así que aquí no hay
 * ni tokens ni cabeceras que montar.
 */
import type { Change, SyncStatus } from '~/shared/types/database'

export interface GithubRepo {
  owner: string
  name: string
  full_name: string
  default_branch: string
}

export interface GithubInstallation {
  id: number
  account: string
  repos: GithubRepo[]
}

export interface ProjectLink {
  project_id: string
  installation_id: number
  owner: string
  repo: string
  branch: string
  path_map: { project: string, repo: string }[]
  last_synced_sha: string | null
  last_synced_at: string | null
}

export interface StatusReport {
  repo: string
  branch: string
  lastSyncedAt: string | null
  status: SyncStatus
  summary: string
  head: string
  skipped: { path: string, reason: string }[]
}

export interface GithubIdentity {
  login: string
  avatar_url: string | null
}

export function useGithub(projectId: MaybeRefOrGetter<string>) {
  const configured = ref(false)
  /** La App tiene secreto de cliente: se puede iniciar sesión con GitHub. */
  const canSignIn = ref(false)
  const identity = ref<GithubIdentity | null>(null)
  const installUrl = ref<string | null>(null)
  const installations = ref<GithubInstallation[]>([])
  const link = ref<ProjectLink | null>(null)
  const report = ref<StatusReport | null>(null)
  const busy = ref<string | null>(null)
  const error = ref('')

  /** Envuelve una llamada: un solo sitio donde poner «ocupado» y recoger el error. */
  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    busy.value = label
    error.value = ''
    try {
      return await fn()
    } catch (e) {
      // Nitro manda el motivo en `statusMessage`; `message` a secas sería
      // «[POST] /api/github/push: 409», que no dice nada.
      const cause = e as { statusMessage?: string, data?: { statusMessage?: string }, message?: string }
      error.value = cause.data?.statusMessage ?? cause.statusMessage ?? cause.message ?? 'error desconocido'
      return null
    } finally {
      busy.value = null
    }
  }

  /**
   * Estado inicial del diálogo, en una sola pasada: si hay App, si esta persona
   * ya inició sesión con GitHub, si el proyecto está enlazado y —si no lo
   * está— con qué repositorios cuenta. Antes esto último era un botón que había
   * que pulsar a mano, y sin pulsarlo el diálogo parecía vacío.
   */
  async function refresh(): Promise<void> {
    const config = await $fetch<{
      configured: boolean
      canSignIn: boolean
      identity: GithubIdentity | null
      installUrl: string | null
    }>('/api/github/config', { query: { projectId: toValue(projectId) } })

    configured.value = config.configured
    canSignIn.value = config.canSignIn
    identity.value = config.identity
    installUrl.value = config.installUrl
    if (!config.configured) return

    link.value = await $fetch<ProjectLink | null>('/api/github/link', {
      query: { projectId: toValue(projectId) }
    })

    if (link.value) await refreshStatus()
    else await loadInstallations()
  }

  /** Sale del sitio: GitHub devuelve al proyecto por el `state` firmado. */
  function signIn(): void {
    window.location.href = `/api/github/oauth/start?projectId=${encodeURIComponent(toValue(projectId))}`
  }

  async function refreshStatus(): Promise<void> {
    await run('Comparando…', async () => {
      report.value = await $fetch<StatusReport>('/api/github/status', {
        query: { projectId: toValue(projectId) }
      })
    })
  }

  async function loadInstallations(): Promise<void> {
    await run('Buscando repositorios…', async () => {
      installations.value = await $fetch<GithubInstallation[]>('/api/github/installations')
    })
  }

  async function connect(input: {
    installationId: number
    owner: string
    repo: string
    branch?: string
    workshop: string
  }): Promise<boolean> {
    const result = await run('Enlazando…', async () => {
      link.value = await $fetch<ProjectLink>('/api/github/link', {
        method: 'POST',
        body: { projectId: toValue(projectId), ...input }
      })
      await refreshStatus()
      return true
    })
    return result === true
  }

  async function disconnect(): Promise<void> {
    await run('Desenlazando…', async () => {
      await $fetch('/api/github/link', {
        method: 'DELETE',
        query: { projectId: toValue(projectId) }
      })
      link.value = null
      report.value = null
    })
  }

  async function pull(force: string[] = []) {
    return run('Trayendo…', async () => {
      const result = await $fetch<{ applied: string[], deleted: string[], conflicts: string[] }>(
        '/api/github/pull',
        { method: 'POST', body: { projectId: toValue(projectId), force } }
      )
      await refreshStatus()
      return result
    })
  }

  async function push(message: string, force: string[] = []) {
    return run('Subiendo…', async () => {
      const result = await $fetch<{ commit: string | null, pushed: string[], deleted: string[] }>(
        '/api/github/push',
        { method: 'POST', body: { projectId: toValue(projectId), message, force } }
      )
      await refreshStatus()
      return result
    })
  }

  return {
    configured, canSignIn, identity, installUrl, installations, link, report, busy, error,
    refresh, refreshStatus, loadInstallations, signIn, connect, disconnect, pull, push
  }
}

export type { Change, SyncStatus }
