/**
 * Traducción de rutas entre un proyecto de Texel y una carpeta de un repo.
 *
 * No coinciden, y esa es toda la dificultad: en Texel un proyecto *es* un
 * taller, su raíz es `main.tex` y la clase del curso le cuelga en `tex/`; en el
 * repo el taller vive en `latex/workshops/ws-01/` y esa misma clase es
 * compartida, en `latex/tex/`, con todos los demás talleres. Traducir mal
 * significa subir la copia privada de un proyecto encima de la clase del curso.
 *
 * Aquí no se habla ni con GitHub ni con Supabase: entra una ruta y un mapa,
 * sale otra ruta. Así las reglas se prueban sin red, que es donde se descubren
 * los casos raros antes de que lleguen a un repositorio de verdad.
 */
import { skipReason } from '../../../app/features/projects/lib/import-folder'

/**
 * Una regla del mapa. `project` es un prefijo de carpeta (`'tex/'`), la raíz
 * (`''`) o un archivo suelto (`'latexmkrc'`); `repo` es su sitio en el
 * repositorio.
 */
export interface PathRule {
  project: string
  repo: string
}

export interface MappedPath {
  /** La otra ruta. */
  path: string
  /** La regla que la produjo, para poder explicarlo en la interfaz. */
  rule: PathRule
}

/** El mapa por defecto de un taller del curso. */
export function defaultPathMap(workshop: string): PathRule[] {
  const dir = trim(workshop)
  return [
    { project: '', repo: dir },
    { project: 'tex/', repo: 'latex/tex/' },
    { project: 'latexmkrc', repo: 'latex/latexmkrc' }
  ]
}

/** Sin barras sobrantes en los extremos: el resto del módulo las da por hechas. */
function trim(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+$/, '')
}

/** Una regla que nombra un archivo concreto, no una carpeta. */
function isFileRule(rule: PathRule): boolean {
  return rule.project !== '' && !rule.project.endsWith('/')
}

/**
 * Las reglas de prefijo más largo primero.
 *
 * El orden es lo que hace que el mapa por defecto funcione: la regla de la raíz
 * (`''`) casa con **todo**, así que si se probara antes que la de `tex/`, la
 * clase del curso acabaría dentro de la carpeta del taller —una copia por
 * taller, y ninguna compartida.
 */
function byPrecedence(rules: PathRule[]): PathRule[] {
  return [...rules].sort((a, b) =>
    (isFileRule(b) ? 1 : 0) - (isFileRule(a) ? 1 : 0) || b.project.length - a.project.length)
}

function matches(path: string, prefix: string): boolean {
  return prefix === '' || path === trim(prefix) || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)
}

function rest(path: string, prefix: string): string {
  if (prefix === '') return path
  const dir = prefix.endsWith('/') ? prefix : `${prefix}/`
  return path.startsWith(dir) ? path.slice(dir.length) : ''
}

function joinPath(base: string, tail: string): string {
  const dir = trim(base)
  if (!tail) return dir
  return dir ? `${dir}/${tail}` : tail
}

/** Ruta del proyecto → ruta del repo. `null` si el mapa no la cubre. */
export function toRepoPath(path: string, rules: PathRule[]): MappedPath | null {
  for (const rule of byPrecedence(rules)) {
    if (!matches(path, rule.project)) continue
    if (isFileRule(rule)) return { path: trim(rule.repo), rule }
    return { path: joinPath(rule.repo, rest(path, rule.project)), rule }
  }
  return null
}

/**
 * Ruta del repo → ruta del proyecto. `null` si cae fuera del mapa.
 *
 * Se exige que la vuelta sea exacta. Con el mapa por defecto,
 * `latex/workshops/ws-01/tex/x` se traduciría a `tex/x`, que al subir volvería
 * a `latex/tex/x`: una ruta que baja a un sitio y sube a otro acabaría
 * duplicando el archivo en cada sincronización. Fuera del mapa, entonces.
 */
export function toProjectPath(repoPath: string, rules: PathRule[]): MappedPath | null {
  const clean = trim(repoPath)
  const candidates = [...rules].sort((a, b) => trim(b.repo).length - trim(a.repo).length)

  for (const rule of candidates) {
    const base = trim(rule.repo)
    if (isFileRule(rule)) {
      if (clean !== base) continue
      return roundTrip(rule.project, rules, clean, rule)
    }
    if (!matches(clean, base)) continue
    const tail = rest(clean, base)
    if (!tail) continue
    const path = rule.project === '' ? tail : joinPath(rule.project, tail)
    const checked = roundTrip(path, rules, clean, rule)
    if (checked) return checked
  }
  return null
}

function roundTrip(path: string, rules: PathRule[], expected: string, rule: PathRule): MappedPath | null {
  return toRepoPath(path, rules)?.path === expected ? { path, rule } : null
}

/**
 * ¿Este archivo entra en la sincronización? Mismas reglas que la importación de
 * una carpeta: los subproductos de compilar, `.git/` y los archivos enormes se
 * quedan fuera en las dos direcciones. Devuelve el motivo, o `null` si entra.
 */
export function syncSkipReason(path: string, size = 0): string | null {
  return skipReason(path, size)
}
