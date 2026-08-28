/** Instalaciones del usuario y repositorios a los que dan acceso. */
import { installationClient } from '../../utils/gh/app'
import { requireUser } from '../../utils/gh/guard'

export default defineEventHandler(async (event) => {
  const caller = await requireUser(event)

  const { data, error } = await caller.admin
    .from('github_installations').select('id, account_login').eq('user_id', caller.userId)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return Promise.all((data ?? []).map(async (row) => {
    const octokit = installationClient(row.id as number)
    // Una instalación que el usuario ya revocó en GitHub sigue en la tabla: se
    // devuelve sin repos en vez de tumbar la lista entera.
    const repos = await octokit.apps.listReposAccessibleToInstallation({ per_page: 100 })
      .then(res => res.data.repositories.map(repo => ({
        owner: repo.owner.login,
        name: repo.name,
        full_name: repo.full_name,
        default_branch: repo.default_branch
      })))
      .catch(() => [])
    return { id: row.id, account: row.account_login, repos }
  }))
})
