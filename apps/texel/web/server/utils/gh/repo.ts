/**
 * Lado GitHub de la sincronización: leer un árbol y escribir un commit.
 *
 * Todo pasa por la API de datos de git (blobs, árboles, commits, referencias) y
 * no por la de contenidos: un commit con veinte archivos es un commit, no
 * veinte, y así el historial del repo dice «esto fue una sincronización» en vez
 * de llenarse de ruido.
 */
import type { Octokit } from '@octokit/rest'
import { syncSkipReason, toProjectPath, type PathRule } from './mapping'

export interface RepoRef {
  owner: string
  repo: string
  branch: string
}

export interface RemoteFile {
  /** Ruta dentro del proyecto, ya traducida. */
  path: string
  /** Ruta real en el repositorio. */
  repoPath: string
  sha: string
  size: number
}

export interface RemoteSnapshot {
  /** Commit al que apunta la rama ahora mismo. */
  head: string
  /** Árbol de ese commit, para poder construir el siguiente encima. */
  treeSha: string
  files: Map<string, RemoteFile>
  /** Lo que quedó fuera del mapa o de las reglas, para poder explicarlo. */
  skipped: { path: string, reason: string }[]
}

/** Estado de la rama: qué archivos del mapa hay y con qué blob. */
export async function readRemote(
  octokit: Octokit,
  ref: RepoRef,
  rules: PathRule[]
): Promise<RemoteSnapshot> {
  const { data: branch } = await octokit.repos.getBranch({
    owner: ref.owner, repo: ref.repo, branch: ref.branch
  })
  const head = branch.commit.sha
  const treeSha = branch.commit.commit.tree.sha

  const { data: tree } = await octokit.git.getTree({
    owner: ref.owner, repo: ref.repo, tree_sha: treeSha, recursive: 'true'
  })
  if (tree.truncated) {
    throw createError({
      statusCode: 507,
      statusMessage: 'el árbol del repositorio viene truncado: demasiados archivos para sincronizar así'
    })
  }

  const files = new Map<string, RemoteFile>()
  const skipped: { path: string, reason: string }[] = []

  for (const entry of tree.tree) {
    if (entry.type !== 'blob' || !entry.path || !entry.sha) continue
    const mapped = toProjectPath(entry.path, rules)
    if (!mapped) continue
    const reason = syncSkipReason(mapped.path, entry.size ?? 0)
    if (reason) { skipped.push({ path: entry.path, reason }); continue }
    files.set(mapped.path, {
      path: mapped.path,
      repoPath: entry.path,
      sha: entry.sha,
      size: entry.size ?? 0
    })
  }

  return { head, treeSha, files, skipped }
}

/** Contenido de un blob. Se pide por sha, así que no depende de la rama. */
export async function readBlob(octokit: Octokit, ref: RepoRef, sha: string): Promise<Buffer> {
  const { data } = await octokit.git.getBlob({ owner: ref.owner, repo: ref.repo, file_sha: sha })
  return Buffer.from(data.content, data.encoding as BufferEncoding)
}

export interface TreeChange {
  repoPath: string
  /** `null` borra el archivo en el commit nuevo. */
  content: Buffer | null
}

/**
 * Un commit con todos los cambios encima de `parent`.
 *
 * `parent` es el commit sobre el que se calculó la comparación. Si la rama se
 * movió mientras tanto, la actualización de la referencia falla y no se pierde
 * nada: el envío se rechaza y toca traer antes. Por eso `force` es siempre
 * falso.
 */
export async function commitChanges(
  octokit: Octokit,
  ref: RepoRef,
  parent: string,
  baseTree: string,
  changes: TreeChange[],
  message: string
): Promise<string> {
  const tree = await Promise.all(changes.map(async (change) => {
    if (change.content === null) {
      return { path: change.repoPath, mode: '100644' as const, type: 'blob' as const, sha: null }
    }
    const { data: blob } = await octokit.git.createBlob({
      owner: ref.owner,
      repo: ref.repo,
      content: change.content.toString('base64'),
      encoding: 'base64'
    })
    return { path: change.repoPath, mode: '100644' as const, type: 'blob' as const, sha: blob.sha }
  }))

  const { data: created } = await octokit.git.createTree({
    owner: ref.owner, repo: ref.repo, base_tree: baseTree, tree
  })

  const { data: commit } = await octokit.git.createCommit({
    owner: ref.owner, repo: ref.repo, message, tree: created.sha, parents: [parent]
  })

  await octokit.git.updateRef({
    owner: ref.owner, repo: ref.repo, ref: `heads/${ref.branch}`, sha: commit.sha, force: false
  })

  return commit.sha
}
