/**
 * SyncTeX: puente entre línea del .tex y coordenadas del PDF.
 *
 * El binario `synctex` necesita el .pdf y el .synctex.gz juntos en disco, así
 * que se descargan del bucket `compiled` a un temporal por consulta. Es una
 * llamada corta y poco frecuente (clic del usuario), no vale la pena cachear.
 */
import { execFile } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { admin } from './supabase.ts'
import { HttpError } from './auth.ts'

const run = promisify(execFile)

export interface PdfArea { page: number, x: number, y: number, w: number, h: number }
export interface SourcePos { file: string, line: number }

interface Ctx { pdfPath: string, synctexPath: string }

async function withBuild<T>(
  compilationId: string,
  projectId: string,
  fn: (ctx: Ctx & { dir: string }) => Promise<T>
): Promise<T> {
  const { data: comp, error } = await admin
    .from('compilations')
    .select('pdf_path, synctex_path, project_id')
    .eq('id', compilationId)
    .single()

  if (error || !comp) throw new HttpError(404, 'compilación no encontrada')
  if (comp.project_id !== projectId) throw new HttpError(403, 'la compilación es de otro proyecto')
  if (!comp.pdf_path || !comp.synctex_path) throw new HttpError(409, 'esa compilación no dejó SyncTeX')

  const dir = await mkdtemp(path.join(tmpdir(), 'synctex-'))
  try {
    for (const remote of [comp.pdf_path as string, comp.synctex_path as string]) {
      const { data, error: dlError } = await admin.storage.from('compiled').download(remote)
      if (dlError) throw new HttpError(500, `descarga de ${remote}: ${dlError.message}`)
      await writeFile(path.join(dir, path.basename(remote)), Buffer.from(await data.arrayBuffer()))
    }
    return await fn({
      dir,
      pdfPath: path.join(dir, path.basename(comp.pdf_path as string)),
      synctexPath: path.join(dir, path.basename(comp.synctex_path as string))
    })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

const field = (out: string, name: string): number | null => {
  const m = new RegExp(`^${name}:(-?[\\d.]+)$`, 'm').exec(out)
  return m ? Number(m[1]) : null
}

/** Editor → PDF. `file` es la ruta relativa dentro del proyecto. */
export async function forward(
  projectId: string,
  compilationId: string,
  file: string,
  line: number
): Promise<PdfArea | null> {
  return withBuild(compilationId, projectId, async ({ dir, pdfPath }) => {
    // synctex resuelve rutas relativas al directorio del PDF; se compiló en
    // build/, así que el fuente se referencia como ../<ruta>.
    const { stdout } = await run(
      'synctex',
      ['view', '-i', `${line}:1:${path.join('..', file)}`, '-o', pdfPath, '-d', dir],
      { timeout: 10_000 }
    ).catch(() => ({ stdout: '' }))

    const page = field(stdout, 'Page')
    const x = field(stdout, 'x')
    const y = field(stdout, 'y')
    if (page === null || x === null || y === null) return null

    return {
      page,
      x,
      y,
      w: field(stdout, 'W') ?? 0,
      h: field(stdout, 'H') ?? 0
    }
  })
}

/** PDF → editor. `x`/`y` en puntos, con el origen arriba a la izquierda. */
export async function inverse(
  projectId: string,
  compilationId: string,
  page: number,
  x: number,
  y: number
): Promise<SourcePos | null> {
  return withBuild(compilationId, projectId, async ({ pdfPath }) => {
    const { stdout } = await run(
      'synctex',
      ['edit', '-o', `${page}:${x}:${y}:${pdfPath}`],
      { timeout: 10_000 }
    ).catch(() => ({ stdout: '' }))

    const input = /^Input:(.+)$/m.exec(stdout)
    const line = field(stdout, 'Line')
    if (!input || line === null) return null

    // Devuelve la ruta tal como la vio TeX (…/build/../sections/01.tex).
    const relative = path.normalize(input[1]!.trim()).split('/').filter(p => p !== '..').join('/')
    return { file: relative, line }
  })
}
