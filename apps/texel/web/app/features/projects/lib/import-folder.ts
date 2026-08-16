/**
 * Plan de importación de una carpeta del ordenador.
 *
 * Aquí no se habla con Supabase: se decide qué entra, con qué ruta y de qué
 * tipo. Todo lo que decide se puede probar sin red, que es justo lo que hace
 * falta para no descubrir en producción que se subió `.git` entero o que un
 * `.aux` de 30 MB rompió la cuota.
 */
import type { TexEngine } from '~/shared/types/database'

/** Un archivo elegido, ya con su ruta dentro del proyecto. */
export interface PlannedFile {
  path: string
  file: File
}

export interface SkippedFile {
  path: string
  reason: string
}

export interface ImportPlan {
  /** Nombre por defecto del proyecto: la carpeta que se eligió. */
  name: string
  /** Archivos de texto; su contenido va en `files.content`. */
  texts: PlannedFile[]
  /** Archivos binarios; van a Storage y la fila guarda `storage_path`. */
  binaries: PlannedFile[]
  skipped: SkippedFile[]
  /** Ruta del `.tex` raíz, si el plan trae alguno. */
  root: string | null
  /** Archivos de la plantilla que se añadieron porque el documento los pedía. */
  added: string[]
}

/** Extensiones que se guardan como texto en la base. El resto va a Storage. */
const TEXT_EXT = new Set([
  'tex', 'bib', 'cls', 'sty', 'bst', 'txt', 'md', 'csv', 'json', 'yml', 'yaml', 'cfg', 'ini'
])

/** Subproductos de compilar: se regeneran solos y no pintan nada en el repo. */
const BUILD_EXT = new Set([
  'aux', 'log', 'out', 'toc', 'lof', 'lot', 'fls', 'fdb_latexmk', 'bbl', 'blg', 'bcf',
  'run.xml', 'nav', 'snm', 'vrb', 'synctex.gz', 'xdv', 'idx', 'ilg', 'ind'
])

/** Carpetas que nunca son parte de un documento. */
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.svn', '.hg', 'out', 'build', '_minted'])

const IGNORED_NAMES = new Set(['.DS_Store', 'Thumbs.db', '.gitignore', '.gitattributes'])

/** Los ocultos se descartan salvo estos, que sí afectan a la compilación. */
const KEPT_DOTFILES = new Set(['.latexmkrc'])

/** Un archivo más grande que esto casi seguro es un descuido. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024
/** Tope de archivos por proyecto, para no vaciar la cuota de un disgusto. */
export const MAX_FILES = 300

/**
 * Convierte lo que da el navegador en un plan.
 *
 * `relativePath` sale de `File.webkitRelativePath` (selector de carpeta) o del
 * recorrido del `DataTransfer` (arrastrar y soltar); en ambos casos empieza por
 * la carpeta elegida, que se quita y se usa como nombre del proyecto.
 */
export function planImport(entries: { relativePath: string, file: File }[]): ImportPlan {
  const name = folderName(entries.map(e => e.relativePath))
  const texts: PlannedFile[] = []
  const binaries: PlannedFile[] = []
  const skipped: SkippedFile[] = []

  for (const entry of entries) {
    const path = stripRoot(entry.relativePath)
    const reason = rejection(path, entry.file)

    if (reason) { skipped.push({ path: path || entry.relativePath, reason }); continue }
    if (texts.length + binaries.length >= MAX_FILES) {
      skipped.push({ path, reason: `pasa del tope de ${MAX_FILES} archivos` })
      continue
    }

    const planned = { path, file: entry.file }
    if (TEXT_EXT.has(extension(path))) texts.push(planned)
    else binaries.push(planned)
  }

  return { name, texts, binaries, skipped, root: null, added: [] }
}

/**
 * Qué le falta a la carpeta para poder compilar.
 *
 * Una carpeta de taller (`workshops/ws-01/`) trae `main.tex`, `meta.tex` y
 * `sections/`, pero **no** la clase: `cysec.cls`, `common/*` y la bibliografía
 * viven un nivel más arriba, en `latex/tex/`. Importada tal cual, el documento
 * muere en `File 'cysec.cls' not found`. Aquí se decide qué archivos de la
 * plantilla hay que añadir para que compile igual que en el repo.
 *
 * El `latexmkrc` entra en el mismo paquete a propósito: es quien apunta
 * `TEXINPUTS` a `tex/`, así que sin él la clase seguiría sin aparecer.
 *
 * Nunca pisa lo que trae el usuario: si la carpeta ya tiene su propia clase o
 * su `latexmkrc`, esos se respetan.
 */
export function missingSharedLayer(
  files: { path: string, content?: string }[],
  template: Record<string, string>
): Record<string, string> {
  const classes = new Set<string>()
  for (const file of files) {
    if (!file.path.endsWith('.tex') || !file.content) continue
    for (const match of file.content.matchAll(/\\documentclass(?:\[[^\]]*\])?\{([^}]+)\}/g)) {
      classes.add(match[1]!.trim())
    }
  }

  const present = new Set(files.map(f => f.path))
  const hasClassFile = (name: string) =>
    files.some(f => f.path === `${name}.cls` || f.path.endsWith(`/${name}.cls`))

  const needed = [...classes].some(name => template[`tex/${name}.cls`] && !hasClassFile(name))
  if (!needed) return {}

  const out: Record<string, string> = {}
  for (const [path, content] of Object.entries(template)) {
    if (!path.startsWith('tex/')) continue
    if (present.has(path)) continue
    out[path] = content
  }
  if (template.latexmkrc && !present.has('latexmkrc') && !present.has('.latexmkrc')) {
    out.latexmkrc = template.latexmkrc
  }
  return out
}

/** ¿Por qué no entra este archivo? `null` si entra. */
function rejection(path: string, file: File): string | null {
  if (!path) return 'ruta vacía'
  const segments = path.split('/')
  const base = segments[segments.length - 1]!

  if (segments.some(s => IGNORED_DIRS.has(s))) return 'carpeta de trabajo'
  if (IGNORED_NAMES.has(base)) return 'archivo de control de versiones'
  if (base.startsWith('.') && !KEPT_DOTFILES.has(base)) return 'archivo oculto'
  if (BUILD_EXT.has(extension(path))) return 'subproducto de compilar'
  if (file.size > MAX_FILE_BYTES) return `pasa de ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB`
  // Las mismas reglas que el `check` de la tabla `files`; mejor descartarlo
  // aquí que recibir un error de Postgres a mitad de la subida.
  if (path.length > 400) return 'ruta demasiado larga'
  if (path.startsWith('/') || path.includes('..')) return 'ruta no permitida'
  return null
}

/** Extensión en minúsculas, con los dobles que importan (`synctex.gz`). */
function extension(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1).toLowerCase()
  if (base.endsWith('.synctex.gz')) return 'synctex.gz'
  if (base.endsWith('.run.xml')) return 'run.xml'
  const dot = base.lastIndexOf('.')
  return dot === -1 ? '' : base.slice(dot + 1)
}

/** Quita el primer segmento: la carpeta que eligió el usuario. */
function stripRoot(relativePath: string): string {
  const clean = relativePath.replace(/^\.?\//, '')
  const slash = clean.indexOf('/')
  return slash === -1 ? clean : clean.slice(slash + 1)
}

function folderName(paths: string[]): string {
  const first = paths[0] ?? ''
  const slash = first.indexOf('/')
  const name = slash === -1 ? '' : first.slice(0, slash)
  return name.trim() || 'Proyecto importado'
}

/**
 * Cuál es el `.tex` principal.
 *
 * Por orden: `main.tex` en la raíz; el `main.tex` más superficial que haya en
 * una subcarpeta (un repo de talleres no tiene raíz propia, el documento vive
 * en `workshops/ws-01/main.tex`); el primero que declare una clase, saltándose
 * las plantillas vacías; y si no, el primer `.tex`.
 */
export function pickRoot(texts: { path: string, content: string }[]): string | null {
  const tex = texts.filter(t => t.path.endsWith('.tex'))
  if (!tex.length) return null

  const mains = rank(tex.filter(t => t.path === 'main.tex' || t.path.endsWith('/main.tex')))
  if (mains.length) return mains[0]!.path

  const declared = rank(tex.filter(t => /^\s*\\documentclass/m.test(t.content)))
  return declared[0]?.path ?? tex[0]!.path
}

/** Lo más superficial primero, y las plantillas al final: nadie compila esas. */
function rank(candidates: { path: string }[]): { path: string }[] {
  return [...candidates].sort((a, b) =>
    (isTemplate(a.path) ? 1 : 0) - (isTemplate(b.path) ? 1 : 0)
    || a.path.split('/').length - b.path.split('/').length
    || a.path.localeCompare(b.path))
}

function isTemplate(path: string): boolean {
  return path.split('/').some(s => s.startsWith('_') || s === 'template' || s === 'plantilla')
}

/**
 * Con qué motor compilarlo. La directiva del propio archivo manda; si no la
 * hay, `fontspec` y compañía solo funcionan con XeTeX o LuaTeX.
 */
export function guessEngine(rootContent: string): TexEngine {
  const declared = /^\s*%\s*!TEX\s+program\s*=\s*(\w+)/im.exec(rootContent)?.[1]?.toLowerCase()
  if (declared === 'xelatex' || declared === 'pdflatex' || declared === 'lualatex') return declared
  if (/\\usepackage(\[[^\]]*\])?\{(fontspec|polyglossia|unicode-math)\}/.test(rootContent)) return 'xelatex'
  if (/\\documentclass(\[[^\]]*\])?\{cysec\}/.test(rootContent)) return 'xelatex'
  return 'pdflatex'
}
