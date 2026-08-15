import { execFile } from 'node:child_process'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { admin } from './supabase.ts'
import { parseLog, type Diagnostic } from './log-parser.ts'
import { HttpError } from './auth.ts'

const run = promisify(execFile)
const TIMEOUT_MS = Number(process.env.COMPILE_TIMEOUT ?? 60) * 1000

const ENGINE_FLAG: Record<string, string> = {
  xelatex: '-pdfxe',
  lualatex: '-pdflua',
  pdflatex: '-pdf'
}

export interface CompileResult {
  id: string
  status: 'success' | 'error'
  log: string
  diagnostics: Diagnostic[]
  pdf_path: string | null
  synctex_path: string | null
  duration_ms: number
}

/**
 * Materializa los archivos del proyecto en un directorio temporal, corre
 * latexmk y sube los resultados. Devuelve la fila de `compilations` creada.
 */
export async function compileProject(projectId: string, userId: string): Promise<CompileResult> {
  const started = Date.now()

  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('root_file, engine')
    .eq('id', projectId)
    .single()
  if (projectError || !project) throw new HttpError(404, 'proyecto no encontrado')

  const { data: files, error: filesError } = await admin
    .from('files')
    .select('path, kind, content, storage_path')
    .eq('project_id', projectId)
  if (filesError) throw new HttpError(500, filesError.message)

  // El id se genera antes de compilar para que el directorio de trabajo sea
  // predecible: SyncTeX registra rutas absolutas y el salto inverso las recorta
  // por este prefijo.
  const compilationId = crypto.randomUUID()
  const workdir = path.join(tmpdir(), `texel-${compilationId}`)
  await mkdir(workdir, { recursive: true })

  try {
    for (const file of files ?? []) {
      const target = safeJoin(workdir, file.path as string)
      await mkdir(path.dirname(target), { recursive: true })

      if (file.kind === 'binary' && file.storage_path) {
        const { data, error } = await admin.storage.from('project-assets').download(file.storage_path)
        if (error) throw new HttpError(500, `no se pudo bajar ${file.path}: ${error.message}`)
        await writeFile(target, Buffer.from(await data.arrayBuffer()))
      } else {
        await writeFile(target, (file.content as string) ?? '', 'utf8')
      }
    }

    const engineFlag = ENGINE_FLAG[project.engine as string] ?? '-pdfxe'
    const root = project.root_file as string
    let log = ''
    let failed = false

    try {
      // -no-shell-escape mata \write18: es la vía obvia de ejecutar comandos
      // arbitrarios desde un .tex subido por cualquiera.
      const { stdout, stderr } = await run(
        'latexmk',
        [
          engineFlag,
          '-synctex=1',
          '-interaction=nonstopmode',
          '-file-line-error',
          '-no-shell-escape',
          '-outdir=build',
          root
        ],
        { cwd: workdir, timeout: TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024 }
      )
      log = stdout + stderr
    } catch (e) {
      // latexmk sale con código ≠ 0 cuando hay errores de LaTeX: no es un fallo
      // del servicio, es un documento que no compila. El log es el resultado.
      const err = e as { stdout?: string, stderr?: string, killed?: boolean }
      log = (err.stdout ?? '') + (err.stderr ?? '')
      failed = true
      if (err.killed) log += `\n\n[texel] Cancelado: superó ${TIMEOUT_MS / 1000}s.`
    }

    // El .log de latexmk trae mucho más detalle que stdout.
    const base = path.basename(root, path.extname(root))
    const detailed = await readFile(path.join(workdir, 'build', `${base}.log`), 'utf8').catch(() => '')
    const fullLog = detailed || log

    const prefix = `${projectId}/${compilationId}`
    let pdfPath: string | null = null
    let synctexPath: string | null = null

    const pdf = await readFile(path.join(workdir, 'build', `${base}.pdf`)).catch(() => null)
    if (pdf) {
      pdfPath = `${prefix}/${base}.pdf`
      const { error } = await admin.storage.from('compiled').upload(pdfPath, pdf, {
        contentType: 'application/pdf',
        upsert: true
      })
      if (error) throw new HttpError(500, `subida del PDF: ${error.message}`)
    }

    const synctex = await readFile(path.join(workdir, 'build', `${base}.synctex.gz`)).catch(() => null)
    if (synctex) {
      synctexPath = `${prefix}/${base}.synctex.gz`
      await admin.storage.from('compiled').upload(synctexPath, synctex, {
        contentType: 'application/gzip',
        upsert: true
      })
    }

    // Hay PDF ⇒ 'success' aunque latexmk devolviera error: LaTeX produce salida
    // con errores recuperables y el usuario quiere verla. Los fallos van en los
    // diagnósticos, que el panel de problemas muestra igual.
    const status = pdf ? 'success' : 'error'
    if (failed && !pdf) log += '\n[texel] latexmk no produjo PDF.'
    const duration = Date.now() - started

    const { data: row, error: insertError } = await admin
      .from('compilations')
      .insert({
        id: compilationId,
        project_id: projectId,
        status,
        engine: project.engine,
        root_file: root,
        log: fullLog.slice(-200_000),   // el log completo puede ser enorme
        diagnostics: parseLog(fullLog, workdir),
        pdf_path: pdfPath,
        synctex_path: synctexPath,
        duration_ms: duration,
        created_by: userId,
        finished_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) throw new HttpError(500, insertError.message)
    return row as CompileResult
  } finally {
    await rm(workdir, { recursive: true, force: true })
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
