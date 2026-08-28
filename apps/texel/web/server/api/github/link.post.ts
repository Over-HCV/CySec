/**
 * Enlaza (o reapunta) un proyecto con una carpeta de un repositorio.
 *
 * `workshop` es la carpeta del taller dentro del repo; el mapa por defecto la
 * combina con la capa compartida (`latex/tex/`). Se puede pasar un `pathMap`
 * entero para casos raros, pero lo normal es no tocarlo.
 *
 * Reapuntar **borra la base** de la comparación a propósito: los shas guardados
 * eran de otra carpeta, y dejarlos haría pasar por «cambió allí» todo lo que la
 * nueva carpeta tenga distinto.
 */
import { installationClient } from '../../utils/gh/app'
import { requireInstallation, requireProject } from '../../utils/gh/guard'
import { defaultPathMap, type PathRule } from '../../utils/gh/mapping'

interface Body {
  projectId: string
  installationId: number
  owner: string
  repo: string
  branch?: string
  workshop?: string
  pathMap?: PathRule[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  const caller = await requireProject(event, body.projectId, 'owner')
  await requireInstallation(caller, body.installationId)

  if (!body.owner || !body.repo) {
    throw createError({ statusCode: 400, statusMessage: 'faltan owner y repo' })
  }
  if (!body.pathMap && !body.workshop) {
    throw createError({ statusCode: 400, statusMessage: 'falta la carpeta del taller' })
  }

  const octokit = installationClient(body.installationId)
  // Se comprueba ahora, con el usuario delante, y no en la primera
  // sincronización: un repo mal escrito da aquí un error que se entiende.
  const { data: repo } = await octokit.repos.get({ owner: body.owner, repo: body.repo })
  const branch = body.branch || repo.default_branch
  await octokit.repos.getBranch({ owner: body.owner, repo: body.repo, branch })

  const pathMap = body.pathMap ?? defaultPathMap(body.workshop!)

  const { data, error } = await caller.admin.from('project_repos').upsert({
    project_id: body.projectId,
    installation_id: body.installationId,
    owner: body.owner,
    repo: body.repo,
    branch,
    path_map: pathMap,
    last_synced_sha: null,
    last_synced_at: null,
    created_by: caller.userId
  }, { onConflict: 'project_id' }).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const { error: baseError } = await caller.admin
    .from('project_repo_files').delete().eq('project_id', body.projectId)
  if (baseError) throw createError({ statusCode: 500, statusMessage: baseError.message })

  return data
})
