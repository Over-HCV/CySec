/**
 * Mantenimiento de Storage: medir, respaldar en local y podar `compiled`.
 *
 *   node scripts/storage-maint.mjs measure
 *   node scripts/storage-maint.mjs backup <dir>
 *   node scripts/storage-maint.mjs prune [--apply] [--orphans]
 *
 * `prune` sin `--apply` solo cuenta lo que borraría. Con `--apply` deja en
 * `compiled` las KEEP compilaciones más recientes de cada proyecto (y la última
 * con PDF), borra el resto (objetos y filas) y los objetos sueltos que no
 * cuelgan de ninguna fila. `--orphans` añade los objetos de `project-assets`
 * que ninguna fila de `files` referencia (ni como original ni como derivada).
 *
 * Nació del día en que el proyecto se quedó sin cuota (402
 * exceed_storage_size_quota): cada compilación dejaba su PDF para siempre.
 *
 * Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const KEEP = Number(process.env.KEEP_COMPILATIONS ?? 5)

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const MB = bytes => `${(bytes / 1048576).toFixed(1)} MB`

/** Todos los objetos de un bucket, recorriendo carpetas. */
async function walk(bucket, prefix = '', acc = []) {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset })
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`)
    for (const o of data) {
      const p = prefix ? `${prefix}/${o.name}` : o.name
      // Las carpetas vienen sin id.
      if (o.id === null) await walk(bucket, p, acc)
      else acc.push({ path: p, size: o.metadata?.size ?? 0 })
    }
    if (data.length < 1000) return acc
  }
}

/** Una tabla entera, por páginas. `order` tiene que ser una columna única. */
async function dump(table, order, columns = '*') {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(columns)
      .order(order).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

async function buckets() {
  const { data, error } = await admin.storage.listBuckets()
  if (error) throw new Error(`listBuckets: ${error.message}`)
  return data.map(b => b.id)
}

async function measure() {
  for (const bucket of await buckets()) {
    const objects = await walk(bucket)
    const total = objects.reduce((s, o) => s + o.size, 0)
    console.log(`${bucket}: ${objects.length} objetos, ${MB(total)}`)
    const byProject = {}
    for (const o of objects) {
      const top = o.path.split('/')[0]
      byProject[top] = (byProject[top] ?? 0) + o.size
    }
    for (const [k, v] of Object.entries(byProject).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`    ${k}  ${MB(v)}`)
    }
  }
  for (const t of ['projects', 'files', 'doc_updates', 'doc_snapshots', 'compilations']) {
    const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true })
    console.log(`${t}: ${error ? error.message : `${count} filas`}`)
  }
}

// Tabla → columna única para paginar. `compilations` va sin `log`: puede pesar
// 200 kB por fila y se regenera compilando.
const TABLES = {
  profiles: ['id'],
  projects: ['id'],
  project_members: ['project_id,user_id'],
  project_invites: ['id'],
  files: ['id'],
  doc_snapshots: ['file_id'],
  doc_updates: ['seq'],
  compilations: ['id', 'id,project_id,status,engine,root_file,mode,source_hash,pdf_path,synctex_path,duration_ms,created_by,created_at,finished_at'],
  github_installations: ['id'],
  github_identities: ['user_id'],
  github_installation_users: ['installation_id,user_id'],
  project_repos: ['project_id'],
  project_repo_files: ['project_id,path']
}

async function backup(dir) {
  if (!dir) throw new Error('uso: backup <dir>')
  const manifest = { created_at: new Date().toISOString(), tables: {}, objects: [] }

  await mkdir(path.join(dir, 'db'), { recursive: true })
  for (const [table, [order, columns]] of Object.entries(TABLES)) {
    try {
      const rows = await dump(table, order.split(',')[0], columns)
      await writeFile(path.join(dir, 'db', `${table}.json`), JSON.stringify(rows))
      manifest.tables[table] = rows.length
      console.log(`db/${table}.json  ${rows.length} filas`)
    } catch (e) {
      // Una tabla que no existe en esta base (migración sin aplicar) no para el resto.
      manifest.tables[table] = `error: ${e.message}`
      console.warn(`db/${table}: ${e.message}`)
    }
  }

  // De `compiled` solo el último PDF bueno de cada proyecto: el resto se
  // regenera compilando y es justo lo que llenó la cuota.
  const compilations = await dump('compilations', 'created_at', 'project_id,status,pdf_path,synctex_path,created_at')
  const latest = new Map()
  for (const c of compilations.reverse()) {
    if (c.status === 'success' && c.pdf_path && !latest.has(c.project_id)) latest.set(c.project_id, c)
  }

  for (const bucket of await buckets()) {
    const objects = bucket === 'compiled'
      ? [...latest.values()].flatMap(c => [c.pdf_path, c.synctex_path]).filter(Boolean).map(p => ({ path: p }))
      : await walk(bucket)
    for (const o of objects) {
      const { data, error } = await admin.storage.from(bucket).download(o.path)
      if (error) {
        console.warn(`${bucket}/${o.path}: ${error.message}`)
        manifest.objects.push({ bucket, path: o.path, error: error.message })
        continue
      }
      const bytes = Buffer.from(await data.arrayBuffer())
      const target = path.join(dir, 'storage', bucket, o.path)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, bytes)
      manifest.objects.push({
        bucket, path: o.path, size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex')
      })
    }
    console.log(`storage/${bucket}  ${objects.length} objetos`)
  }

  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`listo: ${dir}/manifest.json`)
}

async function prune(apply, orphans) {
  const compilations = await dump('compilations', 'created_at', 'id,project_id,status,pdf_path,synctex_path,created_at')
  const byProject = new Map()
  for (const c of compilations.reverse()) {
    if (!byProject.has(c.project_id)) byProject.set(c.project_id, [])
    byProject.get(c.project_id).push(c)          // más reciente primero
  }

  const staleRows = []
  const kept = new Set()
  for (const list of byProject.values()) {
    const lastSuccess = list.find(c => c.status === 'success' && c.pdf_path)
    list.forEach((c, i) => {
      if (i < KEEP || c.id === lastSuccess?.id) {
        for (const p of [c.pdf_path, c.synctex_path]) if (p) kept.add(p)
      } else {
        staleRows.push(c)
      }
    })
  }

  // Lo que se borra de `compiled`: todo lo que no cuelga de una fila conservada,
  // salvo la caché de auxiliares. Así caen también los objetos sin fila.
  const compiled = await walk('compiled')
  const doomed = compiled.filter(o => !kept.has(o.path) && !o.path.includes('/cache/'))
  console.log(`compiled: ${compiled.length} objetos; se borran ${doomed.length} (${MB(doomed.reduce((s, o) => s + o.size, 0))})`)
  console.log(`compilations: ${compilations.length} filas; se borran ${staleRows.length}`)

  let orphanAssets = []
  if (orphans) {
    const files = await dump('files', 'id', 'id,storage_path,proxy_path')
    const referenced = new Set(files.flatMap(f => [f.storage_path, f.proxy_path]).filter(Boolean))
    orphanAssets = (await walk('project-assets')).filter(o => !referenced.has(o.path))
    console.log(`project-assets huérfanos: ${orphanAssets.length} (${MB(orphanAssets.reduce((s, o) => s + o.size, 0))})`)
    for (const o of orphanAssets) console.log(`    ${o.path}  ${MB(o.size)}`)
  }

  if (!apply) {
    console.log('\nsimulación: nada borrado. Repetir con --apply.')
    return
  }

  for (const [bucket, list] of [['compiled', doomed], ['project-assets', orphanAssets]]) {
    const paths = list.map(o => o.path)
    for (let i = 0; i < paths.length; i += 1000) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 1000))
      if (error) throw new Error(`${bucket}: ${error.message}`)
    }
  }
  const ids = staleRows.map(c => c.id)
  for (let i = 0; i < ids.length; i += 500) {
    const { error } = await admin.from('compilations').delete().in('id', ids.slice(i, i + 500))
    if (error) throw new Error(`compilations: ${error.message}`)
  }
  console.log('borrado.')
}

const [cmd, ...args] = process.argv.slice(2)
try {
  if (cmd === 'measure') await measure()
  else if (cmd === 'backup') await backup(args[0])
  else if (cmd === 'prune') await prune(args.includes('--apply'), args.includes('--orphans'))
  else {
    console.error('uso: storage-maint.mjs measure | backup <dir> | prune [--apply] [--orphans]')
    process.exit(1)
  }
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
