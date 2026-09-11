import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile, readdir, rm, stat, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { admin } from './supabase.ts'
import { parseLog, type Diagnostic } from './log-parser.ts'
import { HttpError } from './auth.ts'

const run = promisify(execFile)
const TIMEOUT_MS = Number(process.env.COMPILE_TIMEOUT ?? 60) * 1000

/** Cuánto sobrevive el directorio de un proyecto sin que nadie lo compile. */
const WORKDIR_TTL_MS = Number(process.env.WORKDIR_TTL ?? 30 * 60) * 1000

const ENGINE_FLAG: Record<string, string> = {
  xelatex: '-pdfxe',
  lualatex: '-pdflua',
  pdflatex: '-pdf'
}

/**
 * `fast`: una sola pasada de LaTeX y sin bibliografía. Es para mirar el
 * documento mientras se escribe; la versión buena se saca en `normal`.
 *
 * `full`: ignora todo lo cacheado y rehace el documento entero. Es la salida de
 * emergencia cuando la bibliografía o los índices se quedan atrás; en la
 * interfaz es «Recompilar desde cero».
 */
export type CompileMode = 'normal' | 'fast' | 'full'

/** Cuánto trabajo hace cada modo: uno más profundo sirve para reutilizar el resultado de uno menos. */
const MODE_RANK: Record<CompileMode, number> = { fast: 0, normal: 1, full: 2 }

/**
 * Estado de `build/` que se guarda entre compilaciones: los auxiliares y la
 * base de dependencias de latexmk (`.fdb_latexmk`, `.fls`, `.xdv`), con los que
 * puede decidir que no hay nada que rehacer en vez de repetir la pasada a
 * ciegas.
 *
 * El `.pdf` y el `.synctex.gz` **no** están: son la salida, ya se suben aparte y
 * eran el 95 % del tarball (12,9 MB de los 13). Que falte el PDF solo significa
 * que latexmk rehace la pasada en una instancia fría, y el caso «no ha cambiado
 * nada» lo corta antes `lastMatching` por `source_hash`.
 */
const CACHE_EXT = [
  'aux', 'bbl', 'bcf', 'toc', 'out', 'lof', 'lot', 'run.xml',
  'fdb_latexmk', 'fls', 'xdv'
]

/**
 * Los que NO se restauran en `normal`: son la bibliografía ya resuelta. Si se
 * ponen antes de compilar y biber falla, el PDF sale con las referencias de la
 * primera vez y nadie se entera. En `fast` sí se restauran, que corre sin biber
 * y no tiene con qué rehacerlas.
 */
const VOLATILE_EXT = ['bbl', 'bcf', 'run.xml']

export interface CompileResult {
  id: string
  status: 'success' | 'error'
  log: string
  diagnostics: Diagnostic[]
  pdf_path: string | null
  synctex_path: string | null
  duration_ms: number
}

interface ProjectFile {
  path: string
  kind: string
  content: string | null
  storage_path: string | null
  size_bytes: number | null
  /** Derivada ligera de la imagen, si la hay (ver 008_asset_proxy.sql). */
  proxy_path?: string | null
  proxy_bytes?: number | null
}

/**
 * Con qué versión de las imágenes se compila.
 *
 * `proxy`: la derivada de 1400 px, sin perfil ICC ni canal alfa. Es lo que se
 * mira mientras se escribe, y es la diferencia entre que xdvipdfmx copie el
 * stream del PNG o lo descomprima y lo vuelva a comprimir imagen por imagen.
 *
 * `original`: el archivo tal como se subió. Es la salida buena, la de `full` y
 * la que se descarga.
 */
type Variant = 'proxy' | 'original'

const variantFor = (mode: CompileMode): Variant => (mode === 'full' ? 'original' : 'proxy')

/**
 * Una compilación a la vez por proyecto: el directorio de trabajo es estable
 * (ver `workdirFor`) y Cloud Run corre con `--concurrency 4`, así que dos
 * peticiones del mismo proyecto en la misma instancia se pisarían los
 * auxiliares a media pasada.
 */
const queues = new Map<string, Promise<unknown>>()

/**
 * Lo que una compilación deja hecho después de responder: guardar la caché de
 * auxiliares. No lo espera el usuario, pero sí la cola: `tar` lee `build/` y la
 * siguiente pasada lo reescribe.
 */
const background = new Map<string, Promise<unknown>>()

export function compileProject(
  projectId: string,
  userId: string,
  mode: CompileMode = 'normal'
): Promise<CompileResult> {
  const start = () => compileNow(projectId, userId, mode)
  const prev = queues.get(projectId) ?? Promise.resolve()
  // `.then(start, start)`: una compilación que falla no puede cortar la cola.
  const next = prev.then(start, start)
  const guard = next
    .catch(() => {})
    .then(() => {
      const pending = background.get(projectId)
      background.delete(projectId)
      return pending
    })
    .catch(() => {})
  queues.set(projectId, guard)
  void guard.then(() => {
    if (queues.get(projectId) === guard) queues.delete(projectId)
  })
  return next
}

/** Directorio de trabajo de un proyecto. Estable a propósito: ver `syncSources`. */
const workdirFor = (projectId: string) => path.join(tmpdir(), `texel-${projectId}`)

/**
 * Materializa los archivos del proyecto, corre latexmk y sube los resultados.
 * Devuelve la fila de `compilations` creada.
 */
async function compileNow(
  projectId: string,
  userId: string,
  mode: CompileMode
): Promise<CompileResult> {
  const started = Date.now()

  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('root_file, engine')
    .eq('id', projectId)
    .single()
  if (projectError || !project) throw new HttpError(404, 'proyecto no encontrado')

  const sources = await loadFiles(projectId)

  const root = project.root_file as string
  const variant = variantFor(mode)
  const sourceHash = hashSources(root, project.engine as string, sources, variant)

  // Nada ha cambiado desde la última compilación al menos igual de profunda:
  // se devuelve aquella. Con la compilación automática (2,5 s tras la última
  // tecla) esto se lleva por delante casi todas las peticiones repetidas.
  if (mode !== 'full') {
    const reused = await lastMatching(projectId, sourceHash, mode)
    if (reused) return reused
  }

  // El id se genera antes de compilar: es el prefijo con el que se suben el PDF
  // y el SyncTeX al bucket.
  const compilationId = crypto.randomUUID()
  // Reparto del tiempo por etapas: sin esto, «tarda mucho» no se puede repartir
  // entre sincronizar, compilar y subir, y se optimiza a ciegas.
  const timings: Record<string, number> = {}
  const clock = <T>(name: string, work: PromiseLike<T>): Promise<T> => {
    const from = Date.now()
    return Promise.resolve(work).finally(() => { timings[name] = Date.now() - from })
  }
  const workdir = workdirFor(projectId)
  await mkdir(workdir, { recursive: true })
  // La fecha del directorio es lo que mira la limpieza, y escribir *dentro* no
  // la cambia: sin esto, un proyecto que se compila cada minuto puede parecer
  // abandonado y que se lo lleve la escoba de otra compilación en paralelo.
  await utimes(workdir, new Date(), new Date()).catch(() => {})
  await sweepStaleWorkdirs(workdir)

  const outdir = path.join(path.dirname(root), 'build')
  const buildDir = path.join(workdir, outdir)
  const base = path.basename(root, path.extname(root))

  await clock('sync', syncSources(workdir, sources, variant))

  // `full` empieza de cero: fuera el `build/` de esta instancia y fuera la
  // caché compartida. Es lo único que se borra, y todo es regenerable.
  if (mode === 'full') {
    await rm(buildDir, { recursive: true, force: true })
    await admin.storage.from('compiled').remove([cacheKey(projectId)]).catch(() => {})
  } else {
    await clock('restore_cache', restoreAuxCache(projectId, buildDir, base, mode))
  }

  const engineFlag = ENGINE_FLAG[project.engine as string] ?? '-pdfxe'
  let log = ''
  let failed = false

  // `fast`: una pasada y sin biber. Con los auxiliares de antes, las
  // referencias y las citas siguen saliendo bien salvo que hayan cambiado.
  //
  // `-f` no es opcional aquí: con una sola pasada los archivos casi nunca
  // quedan «estables» (basta con que el .aux cambie), y sin forzar latexmk se
  // planta en «Maximum runs of xelatex reached» *antes* de generar el PDF.
  // Con `-f` sí lo genera, que es justo lo que se quiere para mirar mientras
  // se escribe; los errores siguen saliendo en los diagnósticos.
  const modeArgs = mode === 'fast' ? ['-e', '$max_repeat=1', '-bibtex-', '-f'] : []

  const latexFrom = Date.now()
  try {
    // -no-shell-escape mata \write18: es la vía obvia de ejecutar comandos
    // arbitrarios desde un .tex subido por cualquiera.
    //
    // `-cd`: latexmk entra en la carpeta del archivo raíz antes de compilar, así
    // que un `\input{meta}` de `workshops/ws-01/main.tex` resuelve dentro del
    // taller y no en la raíz del proyecto. Es lo mismo que hace el `Makefile`
    // del repo, y sin ello un proyecto con la estructura del curso no compila.
    const { stdout, stderr } = await run(
      'latexmk',
      [
        engineFlag,
        '-cd',
        '-synctex=1',
        '-interaction=nonstopmode',
        '-file-line-error',
        '-no-shell-escape',
        '-outdir=build',
        ...modeArgs,
        root
      ],
      { cwd: workdir, timeout: TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024, env: texEnv(workdir) }
    )
    log = stdout + stderr
  } catch (e) {
    // latexmk sale con código != 0 cuando hay errores de LaTeX: no es un fallo
    // del servicio, es un documento que no compila. El log es el resultado.
    const err = e as { stdout?: string, stderr?: string, killed?: boolean }
    log = (err.stdout ?? '') + (err.stderr ?? '')
    failed = true
    if (err.killed) log += `\n\n[texel] Cancelado: superó ${TIMEOUT_MS / 1000}s.`
  }
  timings.latexmk = Date.now() - latexFrom

  // Los dos, y en este orden: el .log de xelatex trae el detalle del documento,
  // pero los errores de biber (y el «Please (re)run Biber») solo salen por la
  // salida de latexmk. Quedarse con uno era perder la mitad de las causas.
  const detailed = await readFile(path.join(buildDir, `${base}.log`), 'utf8').catch(() => '')
  const fullLog = [log, detailed].filter(Boolean).join('\n\n')

  const prefix = `${projectId}/${compilationId}`
  let pdfPath: string | null = null
  let synctexPath: string | null = null

  const pdf = await readFile(path.join(buildDir, `${base}.pdf`)).catch(() => null)
  if (pdf) {
    pdfPath = `${prefix}/${base}.pdf`
    const { error } = await clock('upload_pdf', admin.storage.from('compiled').upload(pdfPath, pdf, {
      contentType: 'application/pdf',
      upsert: true
    }))
    if (error) throw new HttpError(500, `subida del PDF: ${error.message}`)
    // Solo se guarda la caché de una compilación que llegó a PDF: los
    // auxiliares de una que reventó a media pasada no valen para la siguiente.
    //
    // Y se guarda *después* de responder: nadie está esperando el tarball, y
    // empaquetarlo y subirlo delante del usuario era tiempo de compilación que
    // no compila nada. La cola por proyecto lo espera igual (ver
    // `compileProject`), así que la siguiente pasada no le escribe el `build/`
    // por debajo mientras `tar` lo lee.
    background.set(projectId, saveAuxCache(projectId, buildDir))
  }

  const synctex = await readFile(path.join(buildDir, `${base}.synctex.gz`)).catch(() => null)
  if (synctex) {
    synctexPath = `${prefix}/${base}.synctex.gz`
    await clock('upload_synctex', admin.storage.from('compiled').upload(synctexPath, synctex, {
      contentType: 'application/gzip',
      upsert: true
    }))
  }

  // Hay PDF ⇒ 'success' aunque latexmk devolviera error: LaTeX produce salida
  // con errores recuperables y el usuario quiere verla. Los fallos van en los
  // diagnósticos, que el panel de problemas muestra igual.
  const status = pdf ? 'success' : 'error'
  const finalLog = failed && !pdf ? `${fullLog}\n[texel] latexmk no produjo PDF.` : fullLog

  timings.total = Date.now() - started
  console.log(`[texel] ${mode} ${projectId} ${JSON.stringify(timings)}`)

  const { data: row, error: insertError } = await insertCompilation({
      id: compilationId,
      project_id: projectId,
      status,
      engine: project.engine,
      root_file: root,
      mode,
      source_hash: sourceHash,
      log: finalLog.slice(-200_000),   // el log completo puede ser enorme
      diagnostics: parseLog(finalLog, workdir),
      pdf_path: pdfPath,
      synctex_path: synctexPath,
      duration_ms: timings.total,
      timings,
      created_by: userId,
      finished_at: new Date().toISOString()
  })

  if (insertError) throw new HttpError(500, insertError.message)
  return row as CompileResult
}

/**
 * TEXINPUTS/BIBINPUTS para las dos disposiciones que hay en producción: la de
 * la plantilla (capa reutilizable en `tex/`, con su `latexmkrc`) y la del
 * proyecto sembrado desde el repo del curso, que no lleva `latexmkrc` y deja
 * `bib/refs.bib` colgando de la raíz. Sin esto, biber no encuentra el .bib en
 * la segunda y la bibliografía se queda en lo que hubiera en el .bbl.
 * Los `:` finales conservan las rutas del sistema.
 */
function texEnv(workdir: string): NodeJS.ProcessEnv {
  const paths = `${workdir}:${workdir}//:${path.join(workdir, 'tex')}//:`
  return { ...process.env, TEXINPUTS: paths, BIBINPUTS: paths }
}

/**
 * Huella del proyecto: si no cambia, el PDF tampoco puede cambiar.
 *
 * La variante entra en la huella porque cambia el PDF: el de las derivadas no
 * vale como respuesta a un `full`, ni al revés.
 */
function hashSources(root: string, engine: string, files: ProjectFile[], variant: Variant): string {
  const h = createHash('sha256').update(`${root} ${engine} ${variant}`)
  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    h.update(` ${f.path} ${signature(f, variant)}`)
  }
  return h.digest('hex')
}

/**
 * Qué identifica el contenido de un archivo. Los binarios, por su objeto en
 * Storage —y por cuál de los dos objetos, que el manifiesto de `syncSources`
 * usa esto para saber si lo que hay en disco es lo que toca: al pasar de `fast`
 * a `full` la firma cambia y la imagen se reescribe con el original.
 */
function signature(file: ProjectFile, variant: Variant): string {
  if (file.kind !== 'binary') return `txt:${createHash('sha1').update(file.content ?? '').digest('hex')}`
  const asset = pickAsset(file, variant)
  return `bin:${asset.path}:${asset.bytes}`
}

/** El objeto que hay que bajar para este archivo: la derivada si toca y existe. */
function pickAsset(file: ProjectFile, variant: Variant): { path: string, bytes: number } {
  if (variant === 'proxy' && file.proxy_path) {
    return { path: file.proxy_path, bytes: file.proxy_bytes ?? 0 }
  }
  return { path: file.storage_path ?? '', bytes: file.size_bytes ?? 0 }
}

/**
 * Los archivos del proyecto.
 *
 * Las columnas de la derivada son de 008_asset_proxy.sql; contra una base que
 * todavía no la tenga, el `select` falla entero, así que se vuelve a pedir sin
 * ellas y se compila con los originales, como antes.
 */
async function loadFiles(projectId: string): Promise<ProjectFile[]> {
  const BASE = 'path, kind, content, storage_path, size_bytes'
  const { data, error } = await admin
    .from('files')
    .select(`${BASE}, proxy_path, proxy_bytes`)
    .eq('project_id', projectId)
  if (!error) return (data ?? []) as ProjectFile[]

  const fallback = await admin.from('files').select(BASE).eq('project_id', projectId)
  if (fallback.error) throw new HttpError(500, fallback.error.message)
  console.warn('[texel] sin columnas de derivada (¿falta 008_asset_proxy.sql?):', error.message)
  return (fallback.data ?? []) as ProjectFile[]
}

/** Igual que el `select`: `timings` es de 008 y una base vieja no lo acepta. */
async function insertCompilation(row: Record<string, unknown>) {
  const first = await admin.from('compilations').insert(row).select().single()
  if (!first.error) return first
  const { timings: _timings, ...rest } = row
  return admin.from('compilations').insert(rest).select().single()
}

/** La última compilación con PDF de esta misma versión del proyecto, si la hay. */
async function lastMatching(
  projectId: string,
  sourceHash: string,
  mode: CompileMode
): Promise<CompileResult | null> {
  const deep = (Object.keys(MODE_RANK) as CompileMode[])
    .filter(m => MODE_RANK[m] >= MODE_RANK[mode])

  const { data, error } = await admin
    .from('compilations')
    .select('*')
    .eq('project_id', projectId)
    .eq('source_hash', sourceHash)
    .eq('status', 'success')
    .in('mode', deep)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Un fallo aquí (o una base sin la columna todavía) solo significa compilar.
  if (error || !data) return null
  return data as CompileResult
}

interface Manifest { [path: string]: string }

const MANIFEST = '.texel-sources.json'

/**
 * Deja el directorio igual a lo que hay en la base, tocando lo mínimo.
 *
 * Reescribir un archivo con el mismo contenido le cambia la fecha, y entonces
 * latexmk vuelve a considerar la pasada aunque no haya cambiado nada: escribir
 * solo lo que de verdad cambió es la mitad de la compilación incremental. La
 * otra mitad es borrar lo que se borró en la app, y para eso se guarda el
 * manifiesto de la vez anterior: así no hay que adivinar qué es fuente y qué es
 * producto de compilar.
 */
async function syncSources(workdir: string, files: ProjectFile[], variant: Variant): Promise<void> {
  const manifestPath = path.join(workdir, MANIFEST)
  const previous: Manifest = await readFile(manifestPath, 'utf8')
    .then(text => JSON.parse(text) as Manifest)
    .catch(() => ({}))

  const current: Manifest = {}
  const pending: ProjectFile[] = []

  for (const file of files) {
    const sig = signature(file, variant)
    current[file.path] = sig
    if (previous[file.path] === sig && await exists(safeJoin(workdir, file.path))) continue
    pending.push(file)
  }

  // En paralelo y no en fila: un directorio frío son decenas de descargas de
  // Storage, y encadenarlas era esperar la latencia una vez por imagen.
  await pool(pending, 8, async (file) => {
    const target = safeJoin(workdir, file.path)
    await mkdir(path.dirname(target), { recursive: true })
    if (file.kind === 'binary') {
      const { path: object } = pickAsset(file, variant)
      if (!object) return
      const { data, error } = await admin.storage.from('project-assets').download(object)
      if (error) throw new HttpError(500, `no se pudo bajar ${file.path}: ${error.message}`)
      await writeFile(target, Buffer.from(await data.arrayBuffer()))
    } else {
      await writeFile(target, file.content ?? '', 'utf8')
    }
  })

  for (const stale of Object.keys(previous)) {
    if (stale in current) continue
    await rm(safeJoin(workdir, stale), { force: true }).catch(() => {})
  }

  await writeFile(manifestPath, JSON.stringify(current), 'utf8')
}

const exists = (p: string) => stat(p).then(() => true, () => false)

/** Ejecuta `work` sobre todos los elementos, con como mucho `width` a la vez. */
async function pool<T>(items: T[], width: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const worker = async () => {
    while (next < items.length) await work(items[next++]!)
  }
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, worker))
}

/**
 * Borra los directorios de otros proyectos que lleven un rato sin usarse.
 *
 * `/tmp` en Cloud Run es tmpfs: ocupa RAM de la instancia, y la instancia tiene
 * 2 GiB para todo. Mantener el directorio vivo es lo que hace incremental la
 * compilación, pero mantenerlos *todos* vivos para siempre es quedarse sin
 * memoria a media pasada.
 */
async function sweepStaleWorkdirs(keep: string): Promise<void> {
  try {
    const root = tmpdir()
    for (const name of await readdir(root)) {
      if (!name.startsWith('texel-')) continue
      const dir = path.join(root, name)
      if (dir === keep) continue
      const info = await stat(dir).catch(() => null)
      if (!info?.isDirectory()) continue
      if (Date.now() - info.mtimeMs < WORKDIR_TTL_MS) continue
      await rm(dir, { recursive: true, force: true })
    }
  } catch (e) {
    console.warn('[texel] no se pudieron limpiar los directorios viejos:', e)
  }
}

/** Dónde vive la caché de `build/` de un proyecto. */
const cacheKey = (projectId: string) => `${projectId}/cache/aux.tgz`

/**
 * Reconstruye `build/` con el estado de la última compilación con PDF.
 *
 * Solo cuando el directorio está frío: si esta instancia ya compiló el
 * proyecto, lo que hay en disco es más nuevo que el tarball, que pudo dejarlo
 * otra instancia hace rato.
 *
 * Cualquier fallo se ignora a propósito: sin caché el documento compila igual,
 * solo que más despacio, y no hay motivo para tumbar una compilación porque
 * Storage tuvo un mal día.
 */
async function restoreAuxCache(
  projectId: string,
  buildDir: string,
  base: string,
  mode: CompileMode
): Promise<void> {
  try {
    if (await exists(path.join(buildDir, `${base}.fdb_latexmk`))) return

    const { data, error } = await admin.storage.from('compiled').download(cacheKey(projectId))
    if (error || !data) return
    await mkdir(buildDir, { recursive: true })
    const tarball = path.join(buildDir, '.aux-cache.tgz')
    await writeFile(tarball, Buffer.from(await data.arrayBuffer()))

    // Sin `-m`: las fechas del tarball son parte de la información, latexmk las
    // compara. Las exclusiones dejan fuera la bibliografía ya resuelta salvo en
    // `fast`.
    const exclude = mode === 'fast' ? [] : VOLATILE_EXT.map(ext => `--exclude=*.${ext}`)
    await run('tar', ['-xzpf', tarball, '-C', buildDir, ...exclude])
    await rm(tarball, { force: true })
  } catch (e) {
    // Sin caché se compila desde cero; se deja rastro para no perseguir
    // fantasmas cuando una compilación tarde el doble de lo esperado.
    console.warn('[texel] no se pudo restaurar la caché de auxiliares:', e)
  }
}

/** Guarda `build/` para la próxima compilación. Mismo trato a los fallos. */
async function saveAuxCache(projectId: string, buildDir: string): Promise<void> {
  try {
    const names = (await readdir(buildDir))
      .filter(name => CACHE_EXT.some(ext => name.endsWith(`.${ext}`)))
    if (!names.length) return

    const tarball = path.join(buildDir, '.aux-cache.tgz')
    // `gzip -1` y no el nivel 6 por defecto: aquí lo que manda es el `.xdv`, que
    // ya viene medio comprimido, y el nivel alto solo gasta CPU.
    await run('tar', ['-cf', tarball, '-I', 'gzip -1', '-C', buildDir, ...names])
    const bytes = await readFile(tarball)
    await rm(tarball, { force: true })

    const { error } = await admin.storage.from('compiled').upload(cacheKey(projectId), bytes, {
      contentType: 'application/gzip',
      upsert: true
    })
    if (error) throw error
  } catch (e) {
    console.warn('[texel] no se pudo guardar la caché de auxiliares:', e)
  }
}

/** Impide que un `path` malicioso escriba fuera del directorio de trabajo. */
export function safeJoin(root: string, relative: string): string {
  const target = path.resolve(root, relative)
  if (!target.startsWith(path.resolve(root) + path.sep)) {
    throw new HttpError(400, `ruta no permitida: ${relative}`)
  }
  return target
}
