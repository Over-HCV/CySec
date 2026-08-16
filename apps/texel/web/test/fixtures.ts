/**
 * Los tests leen los archivos reales del curso, no copias. Si alguien cambia un
 * taller y el escáner deja de entenderlo, el test lo dice ese mismo día.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Block } from '../app/features/visual/lib/types'

/** Raíz del repo, cuatro niveles por encima de `web/test/`. */
export function repoFile(relative: string): string {
  return readFileSync(fileURLToPath(new URL(`../../../../${relative}`, import.meta.url)), 'utf8')
}

export const REFS_BIB = 'latex/tex/bib/refs.bib'
export const WS01 = 'latex/workshops/ws-01'
export const SECTIONS = [
  `${WS01}/sections/01-confidencialidad.tex`,
  `${WS01}/sections/02-integridad.tex`,
  `${WS01}/sections/03-disponibilidad.tex`,
  `${WS01}/sections/04-aaa-dbir.tex`
]

/** El invariante: los bloques cubren el texto entero, sin huecos ni solapes. */
export function joined(text: string, blocks: Block[]): string {
  return blocks.map(b => text.slice(b.span.from, b.span.to)).join('')
}

/** Igual, pero para los hijos dentro del rango de su padre. */
export function joinedItems(text: string, parent: Block): string {
  return (parent.items ?? []).map(b => text.slice(b.span.from, b.span.to)).join('')
}

export function countKind(blocks: Block[], kind: Block['kind']): number {
  return blocks.filter(b => b.kind === kind).length
}
