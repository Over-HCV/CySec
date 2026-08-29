/** Instalaciones a las que llega esta persona y repositorios que dan acceso. */
import { installationClient } from '../../utils/gh/app'
import { requireUser } from '../../utils/gh/guard'

export default defineEventHandler(async (event) => {
  const caller = await requireUser(event)

  // Por la tabla puente, no por quién la registró: dos personas con el mismo
  // acceso en GitHub tienen el mismo acceso aquí.
  const { data, error } = await caller.admin
    .from('github_installation_users')
    .select('installation_id, github_installations(account_login)')
    .eq('user_id', caller.userId)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return Promise.all((data ?? []).map(async (row) => {
    const id = row.installation_id as number
    // PostgREST devuelve la relación como array aunque sea una sola fila.
    const joined = row.github_installations as unknown as { account_login: string }[] | { account_login: string } | null
    const account = (Array.isArray(joined) ? joined[0] : joined)?.account_login ?? 'desconocida'
    const octokit = installationClient(id)
    // Una instalación que ya se revocó en GitHub sigue un rato en la tabla: se
    // devuelve sin repos en vez de tumbar la lista entera.
    const repos = await octokit.apps.listReposAccessibleToInstallation({ per_page: 100 })
      .then(res => res.data.repositories.map(repo => ({
        owner: repo.owner.login,
        name: repo.name,
        full_name: repo.full_name,
        default_branch: repo.default_branch
      })))
      .catch(() => [])
    return { id, account, repos }
  }))
})
