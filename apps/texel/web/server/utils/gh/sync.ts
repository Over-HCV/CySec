/**
 * Las dos operaciones: traer y subir.
 *
 * Las dos parten de la misma comparación (`computeStatus`), así que lo que la
 * interfaz enseña antes de pulsar y lo que ocurre al pulsar no pueden discrepar.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Octokit } from '@octokit/rest'
import { installationClient } from './app'
import { classify, summarize, type Change, type SyncStatus } from './diff'
import { toRepoPath, type PathRule } from './mapping'
import {
  deleteLocal, readBase, readProject, rewriteBase, writeIncoming,
  type LocalFile, type LocalSnapshot
} from './project'
import { commitChanges, readBlob, readRemote, type RemoteSnapshot, type RepoRef } from './repo'

export interface Link {
  project_id: string
  installation_id: number
  owner: string
  repo: string
  branch: string
  path_map: PathRule[]
  last_synced_sha: string | null
  last_synced_at: string | null
}

export interface StatusReport {
  status: SyncStatus
  summary: string
  head: string
  /** Archivos que no entran en la sincronización, con el motivo. */
  skipped: { path: string, reason: string }[]
}

/** El enlace del proyecto, o un 404 con un mensaje que la interfaz pueda pintar. */
export async function loadLink(admin: SupabaseClient, projectId: string): Promise<Link> {
  const { data, error } = await admin
    .from('project_repos').select('*').eq('project_id', projectId).maybeSingle()
  if (error) throw error
  if (!data) throw createError({ statusCode: 404, statusMessage: 'este proyecto no está enlazado con ningún repositorio' })
  return data as Link
}

export function refOf(link: Link): RepoRef {
  return { owner: link.owner, repo: link.repo, branch: link.branch }
}

export interface Snapshots {
  octokit: Octokit
  local: LocalSnapshot
  remote: RemoteSnapshot
  report: StatusReport
}

/**
 * Compara las tres partes. Es lo caro de todo esto —vuelca los documentos Yjs,
 * baja los binarios y lee el árbol del repo— así que las rutas lo hacen una vez
 * y se pasan el resultado.
 */
export async function computeStatus(admin: SupabaseClient, link: Link): Promise<Snapshots> {
  const octokit = installationClient(link.installation_id)
  const [local, remote, base] = await Promise.all([
    readProject(admin, link.project_id),
    readRemote(octokit, refOf(link), link.path_map),
    readBase(admin, link.project_id)
  ])

  const status = classify(
    new Map([...local.files].map(([path, file]) => [path, file.sha])),
    new Map([...remote.files].map(([path, file]) => [path, file.sha])),
    base
  )

  return {
    octokit,
    local,
    remote,
    report: {
      status,
      summary: summarize(status),
      head: remote.head,
      skipped: [...local.skipped, ...remote.skipped]
    }
  }
}

export interface PullResult {
  applied: string[]
  deleted: string[]
  conflicts: string[]
  head: string
  summary: string
}

/**
 * Trae del repositorio lo que cambió allí.
 *
 * Los conflictos no se tocan salvo que se nombren en `force`: quien los resuelve
 * es una persona, y hacerlo por ella significaría perder uno de los dos textos
 * sin que nadie lo haya visto.
 */
export async function pull(
  admin: SupabaseClient,
  link: Link,
  snapshots: Snapshots,
  force: string[] = []
): Promise<PullResult> {
  const { octokit, local, remote, report } = snapshots
  const forced = new Set(force)
  const changes = [
    ...report.status.behind,
    ...report.status.conflicts.filter(change => forced.has(change.path))
  ]

  const applied: string[] = []
  const deleted: string[] = []

  for (const change of changes) {
    const existing = local.files.get(change.path)
    if (!change.remote) {
      if (existing) { await deleteLocal(admin, link.project_id, existing); deleted.push(change.path) }
      continue
    }
    const file = remote.files.get(change.path)!
    const content = await readBlob(octokit, refOf(link), file.sha)
    await writeIncoming(admin, link.project_id, change.path, content, existing)
    applied.push(change.path)
  }

  // La base solo se puede mover hasta donde llegó de verdad la sincronización:
  // si queda un conflicto sin resolver, ese archivo conserva su base vieja o el
  // conflicto desaparecería solo en la siguiente comparación.
  await commitBase(admin, link, snapshots, new Set([...applied, ...deleted]), forced, 'remote')

  return {
    applied,
    deleted,
    conflicts: report.status.conflicts.filter(c => !forced.has(c.path)).map(c => c.path),
    head: remote.head,
    summary: report.summary
  }
}

export interface PushResult {
  commit: string | null
  pushed: string[]
  deleted: string[]
  conflicts: string[]
  summary: string
}

/**
 * Sube al repositorio lo que cambió aquí, en un solo commit.
 *
 * Se rechaza si hay algo que traer: el commit se construye sobre el árbol
 * remoto actual, así que subir con cambios pendientes de bajar dejaría el
 * repositorio bien pero la base mintiendo sobre lo que hay en el proyecto.
 */
export async function push(
  admin: SupabaseClient,
  link: Link,
  snapshots: Snapshots,
  message: string,
  force: string[] = []
): Promise<PushResult> {
  const { octokit, local, remote, report } = snapshots
  const forced = new Set(force)
  const pending = [
    ...report.status.behind,
    ...report.status.conflicts.filter(change => !forced.has(change.path))
  ]

  if (pending.length) {
    throw createError({
      statusCode: 409,
      statusMessage: `hay ${pending.length} cambio(s) que traer antes de subir: ${pending.map(c => c.path).join(', ')}`
    })
  }

  const changes = [
    ...report.status.ahead,
    ...report.status.conflicts.filter(change => forced.has(change.path))
  ]
  if (!changes.length) {
    return { commit: null, pushed: [], deleted: [], conflicts: [], summary: report.summary }
  }

  const pushed: string[] = []
  const deleted: string[] = []
  const tree = changes.map((change) => {
    const repoPath = toRepoPath(change.path, link.path_map)
    if (!repoPath) {
      throw createError({ statusCode: 500, statusMessage: `sin sitio en el repo para ${change.path}` })
    }
    const file = local.files.get(change.path)
    if (file) pushed.push(change.path)
    else deleted.push(change.path)
    return { repoPath: repoPath.path, content: file?.content ?? null }
  })

  const commit = await commitChanges(
    octokit, refOf(link), remote.head, remote.treeSha, tree, message
  )

  await commitBase(admin, link, snapshots, new Set([...pushed, ...deleted]), forced, 'local', commit)

  return { commit, pushed, deleted, conflicts: [], summary: report.summary }
}

/**
 * Reescribe la base y la marca de sincronización.
 *
 * Lo que quedó sin resolver conserva su base anterior; lo demás pasa a ser el
 * sha que tienen las dos partes ahora. `winner` dice de qué lado salió ese
 * contenido —del repo al traer, del proyecto al subir—, y no es un detalle: la
 * foto remota que se comparó es de *antes* del commit, así que después de subir
 * el sha bueno es el del proyecto. Tomar el otro dejaría cada archivo subido
 * marcado como «cambió en el repo» en la siguiente comparación.
 *
 * `commit` es el commit nuevo cuando se acaba de subir, y se omite cuando solo
 * se trajo.
 */
async function commitBase(
  admin: SupabaseClient,
  link: Link,
  snapshots: Snapshots,
  touched: Set<string>,
  forced: Set<string>,
  winner: 'local' | 'remote',
  commit?: string
): Promise<void> {
  const previous = await readBase(admin, link.project_id)
  const unresolved = new Set(
    snapshots.report.status.conflicts.filter(c => !forced.has(c.path)).map(c => c.path)
  )

  const entries: { path: string, sha: string, size: number }[] = []
  const paths = new Set([
    ...snapshots.local.files.keys(),
    ...snapshots.remote.files.keys(),
    ...previous.keys()
  ])

  for (const path of paths) {
    const localFile = snapshots.local.files.get(path)
    const remoteFile = snapshots.remote.files.get(path)

    if (unresolved.has(path)) {
      const old = previous.get(path)
      if (old) entries.push({ path, sha: old, size: localFile?.size ?? 0 })
      continue
    }

    if (touched.has(path)) {
      // El que ganó es el que quedó en los dos sitios. Si el ganador ya no
      // tiene el archivo, es que la sincronización fue un borrado: fuera de la
      // base, o la próxima comparación lo resucitaría.
      const source = winner === 'local' ? localFile : remoteFile
      if (!source) continue
      entries.push({ path, sha: source.sha, size: source.size })
      continue
    }

    // Lo que no se tocó entra si las dos partes ya coincidían —así no aparece
    // como novedad la próxima vez—; si no, conserva la base que tuviera.
    const settled = localFile && remoteFile && localFile.sha === remoteFile.sha
      ? localFile.sha
      : previous.get(path)
    if (!settled) continue
    entries.push({ path, sha: settled, size: localFile?.size ?? remoteFile?.size ?? 0 })
  }

  await rewriteBase(admin, link.project_id, entries)

  const { error } = await admin.from('project_repos').update({
    last_synced_sha: commit ?? snapshots.remote.head,
    last_synced_at: new Date().toISOString()
  }).eq('project_id', link.project_id)
  if (error) throw error
}

export type { Change, SyncStatus }
