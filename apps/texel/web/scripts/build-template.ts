/**
 * Genera la plantilla que usa «Nuevo proyecto» a partir del repo del curso.
 *
 *   node --experimental-strip-types scripts/build-template.ts
 *
 * Un proyecto de Texel tiene que traer **la capa compartida y el taller**, o no
 * compila: `main.tex` hace `\documentclass{cysec}` y `\input{meta}`, y la clase
 * vive en `latex/tex/`. Así que la plantilla es `latex/tex/**` +
 * `latex/latexmkrc` + `latex/workshops/_template/**`, tal cual está en el repo.
 *
 * Se copia a un archivo generado en vez de leerse en caliente porque la web no
 * tiene acceso al disco del repo: en producción solo existe el bundle. La
 * fuente sigue siendo `latex/`, y `test/template.test.ts` compara para que la
 * copia no se quede vieja en silencio.
 *
 * Desde que Texel vive en su propio repositorio, `latex/` ya no es una carpeta
 * hermana garantizada: puede estar en disco (un clon de CySec al lado) o no
 * estar. De ahí `LatexSource`, con dos implementaciones —disco y GitHub— y la
 * misma forma para las dos. El repo del curso es público, así que la lectura
 * remota no necesita credenciales.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../app/features/projects/lib/template.generated.ts', import.meta.url))

/** Repositorio del curso, de donde sale la plantilla cuando no hay disco. */
const REPO = process.env.TEXEL_LATEX_REPO ?? 'Over-HCV/CySec'
const BRANCH = process.env.TEXEL_LATEX_BRANCH ?? 'main'

/**
 * Dónde buscar `latex/` en disco, en orden. La primera es la que se pide a
 * mano; las otras dos cubren los dos sitios donde suele estar: un clon de CySec
 * al lado de este repo, y el monorepo de antes de la separación.
 */
const DISK_CANDIDATES = [
  process.env.TEXEL_LATEX_DIR,
  fileURLToPath(new URL('../../../CySec/latex', import.meta.url)),
  fileURLToPath(new URL('../../../../latex', import.meta.url))
].filter((path): path is string => Boolean(path))

/**
 * Qué entra en la plantilla, con la ruta que tendrá dentro del proyecto.
 *
 * El taller va en la **raíz** del proyecto, no en `workshops/ws-01/`: en Texel un
 * proyecto es un taller, y así `\input{meta}` resuelve sin depender de que el
 * compilador entre en la carpeta del archivo raíz. La capa compartida conserva
 * su sitio en `tex/`, que es donde el `latexmkrc` apunta `TEXINPUTS`.
 */
const SOURCES = [
  { from: 'tex', to: 'tex' },
  { from: 'workshops/_template', to: '' }
]
const FILES = [{ from: 'latexmkrc', to: 'latexmkrc' }]

/**
 * Carpetas que nunca entran en la plantilla. `build/` es donde el `latexmkrc`
 * deja el PDF y los auxiliares: compilar el taller de plantilla una sola vez
 * metía dieciocho subproductos en la plantilla —y en cada proyecto nuevo.
 */
const IGNORED_DIRS = new Set(['build', 'node_modules'])

function ignored(path: string): boolean {
  return path.split('/').some(part => part.startsWith('.') || IGNORED_DIRS.has(part))
}

/** El archivo raíz del taller creado a partir de la plantilla. */
export const TEMPLATE_ROOT = 'main.tex'

/**
 * Un `latex/` legible: rutas relativas a su raíz y contenido por ruta. Da igual
 * si detrás hay un disco o una API.
 */
export interface LatexSource {
  /** De dónde sale, para poder decirlo en un mensaje de error. */
  label: string
  /** Todas las rutas de archivo, relativas a la raíz de `latex/`. */
  list(): Promise<string[]>
  read(path: string): Promise<string>
}

async function walk(dir: string, base: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await walk(full, base))
    else if (!entry.name.startsWith('.')) out.push(relative(base, full))
  }
  return out.sort()
}

/**
 * `latex/` en disco, si alguno de los candidatos existe y trae la clase del
 * curso. Se comprueba `tex/cysec.cls` y no solo la carpeta: un directorio vacío
 * daría una plantilla vacía sin que nada fallara.
 */
export async function diskSource(): Promise<LatexSource | null> {
  for (const root of DISK_CANDIDATES) {
    try {
      await readFile(join(root, 'tex/cysec.cls'), 'utf8')
    } catch {
      continue
    }
    return {
      label: root,
      list: () => walk(root, root),
      read: (path: string) => readFile(join(root, path), 'utf8')
    }
  }
  return null
}

/**
 * `latex/` leído del repositorio público del curso. El árbol viene de una sola
 * llamada (`?recursive=1`) y cada archivo de `raw.githubusercontent.com`, que
 * no gasta cuota de API.
 */
export function githubSource(ref: string = BRANCH): LatexSource {
  let cache: string[] | null = null

  return {
    label: `github:${REPO}@${ref}`,
    async list() {
      if (cache) return cache
      const res = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${ref}?recursive=1`, {
        headers: { accept: 'application/vnd.github+json' }
      })
      if (!res.ok) throw new Error(`no se pudo leer el árbol de ${REPO}@${ref}: ${res.status}`)
      const tree = await res.json() as { tree: { path: string, type: string }[], truncated?: boolean }
      if (tree.truncated) throw new Error(`el árbol de ${REPO} viene truncado: hace falta un clon en disco`)
      cache = tree.tree
        .filter(entry => entry.type === 'blob' && entry.path.startsWith('latex/'))
        .map(entry => entry.path.slice('latex/'.length))
        .sort()
      return cache
    },
    async read(path: string) {
      const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${ref}/latex/${path}`)
      if (!res.ok) throw new Error(`no se pudo leer latex/${path}: ${res.status}`)
      return res.text()
    }
  }
}

/** Disco si lo hay, GitHub si no. */
export async function resolveSource(): Promise<LatexSource> {
  return await diskSource() ?? githubSource()
}

export async function collect(source?: LatexSource): Promise<Record<string, string>> {
  const from = source ?? await resolveSource()
  const all = (await from.list()).filter(path => !ignored(path))
  const files: Record<string, string> = {}

  for (const { from: dir, to } of SOURCES) {
    const prefix = `${dir}/`
    for (const path of all.filter(p => p.startsWith(prefix))) {
      const rel = path.slice(prefix.length)
      files[to === '' ? rel : `${to}/${rel}`] = await from.read(path)
    }
  }
  for (const { from: path, to } of FILES) {
    files[to] = await from.read(path)
  }

  return files
}

export function render(files: Record<string, string>): string {
  const entries = Object.keys(files).sort()
    .map(path => `  ${JSON.stringify(path)}: ${JSON.stringify(files[path])}`)
    .join(',\n')

  return `/**
 * Plantilla de proyecto — GENERADO, no se edita a mano.
 *
 * Sale de \`latex/tex\`, \`latex/latexmkrc\` y \`latex/workshops/_template\` del
 * repositorio del curso. Para regenerarlo:
 *
 *   cd web && node --experimental-strip-types scripts/build-template.ts
 *
 * \`test/template.test.ts\` comprueba que sigue coincidiendo con el repo.
 */

/** Archivo raíz del proyecto creado a partir de la plantilla. */
export const TEMPLATE_ROOT = ${JSON.stringify(TEMPLATE_ROOT)}

/** Ruta dentro del proyecto → contenido. */
export const TEMPLATE_FILES: Record<string, string> = {
${entries}
}
`
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) {
  const source = await resolveSource()
  const files = await collect(source)
  await writeFile(OUT, render(files), 'utf8')
  console.log(`plantilla: ${Object.keys(files).length} archivos desde ${source.label} → ${relative(process.cwd(), OUT)}`)
}
