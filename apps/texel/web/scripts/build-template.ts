/**
 * Genera la plantilla que usa «Nuevo proyecto» a partir del repo.
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
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const LATEX = fileURLToPath(new URL('../../../../latex', import.meta.url))
const OUT = fileURLToPath(new URL('../app/features/projects/lib/template.generated.ts', import.meta.url))

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

/** El archivo raíz del taller creado a partir de la plantilla. */
export const TEMPLATE_ROOT = 'main.tex'

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await walk(full))
    else if (!entry.name.startsWith('.')) out.push(full)
  }
  return out.sort()
}

export async function collect(): Promise<Record<string, string>> {
  const files: Record<string, string> = {}

  for (const { from, to } of SOURCES) {
    const base = join(LATEX, from)
    for (const path of await walk(base)) {
      const rel = relative(base, path)
      files[to === '' ? rel : `${to}/${rel}`] = await readFile(path, 'utf8')
    }
  }
  for (const { from, to } of FILES) {
    files[to] = await readFile(join(LATEX, from), 'utf8')
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
 * Sale de \`latex/tex\`, \`latex/latexmkrc\` y \`latex/workshops/_template\`.
 * Para regenerarlo:
 *
 *   cd apps/texel/web && node --experimental-strip-types scripts/build-template.ts
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
  const files = await collect()
  await writeFile(OUT, render(files), 'utf8')
  console.log(`plantilla: ${Object.keys(files).length} archivos → ${relative(process.cwd(), OUT)}`)
}
