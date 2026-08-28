/**
 * Los tests leen los archivos reales del curso, no copias. Si alguien cambia un
 * taller y el escáner deja de entenderlo, el test lo dice ese mismo día.
 *
 * Esos archivos viven en otro repositorio (Over-HCV/CySec) desde que Texel se
 * separó, así que puede que no estén en esta máquina. Cuando no están, las
 * suites que dependen de ellos se saltan —`describe.skipIf(!hasRepo)`— en vez
 * de fallar por un `ENOENT` que no dice nada del código.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Block } from '../app/features/visual/lib/types'

/**
 * Raíz del repo del curso. `CYSEC_DIR` manda: si se pasa, se usa esa y solo
 * esa, que es lo que permite comprobar el camino de «no está» sin borrar nada.
 * Si no, se prueban el clon hermano y el monorepo de antes de la separación.
 */
function resolveRepo(): string | null {
  const candidates = process.env.CYSEC_DIR
    ? [process.env.CYSEC_DIR]
    : [
        fileURLToPath(new URL('../../../CySec', import.meta.url)),
        fileURLToPath(new URL('../../../../', import.meta.url))
      ]
  return candidates.find(root => existsSync(join(root, 'latex/tex/cysec.cls'))) ?? null
}

export const REPO_ROOT = resolveRepo()
export const hasRepo = REPO_ROOT !== null

/**
 * Contenido de un archivo del repo del curso, por ruta relativa a su raíz.
 * Devuelve cadena vacía si el repo no está: hay tests que lo llaman al importar
 * el módulo, antes de que `skipIf` pueda intervenir.
 */
export function repoFile(relative: string): string {
  return REPO_ROOT ? readFileSync(join(REPO_ROOT, relative), 'utf8') : ''
}

/**
 * Un taller de mentira con **todas** las construcciones del catálogo.
 *
 * Los archivos de verdad son la fuente para los invariantes —que la partición
 * cubra el archivo, que los spans apunten donde dicen—, pero no para probar una
 * construcción concreta: un taller se escribe, y lo que hoy tiene tres fuentes y
 * una opción sin marcar mañana no las tiene. Las pruebas que necesitan una
 * construcción la traen aquí escrita, y así dejan de romperse cada vez que
 * alguien contesta una pregunta.
 */
export const SAMPLE_TEX = `\\section{Confidencialidad}

\\begin{caso}{Un caso de ejemplo (2015)}
  Investigar el caso de ejemplo y responder a las preguntas de abajo.
\\end{caso}

\\begin{fuentes}
  \\fuente{https://ejemplo.org/primera}
  \\fuente{https://segunda.example/articulo}
  \\fuente{https://tercera.example/informe}
  \\item una entrada suelta, que no es una fuente
\\end{fuentes}

\\pregunta{¿Primera pregunta?}
\\begin{respuesta}
\\end{respuesta}

\\pregunta{¿Segunda pregunta?}
\\begin{respuesta}
\\end{respuesta}

\\pregunta{¿Tercera pregunta?}
\\begin{respuesta}
\\end{respuesta}

\\subsection*{Validación de entendimiento del caso}

\\begin{mcq}{El enunciado del mcq, que ocupa
  más de una línea (1 o más respuestas válidas):}
  \\opcion{Primera opción.}
  \\opcion{Segunda opción.}
  \\opcion{Tercera opción.}
  \\opcion{Cuarta opción.}
\\end{mcq}

\\porque{verificar contra las diapositivas}{%
  Marca tu elección con \\texttt{\\textbackslash opcion*}.%
}
`

/** Un archivo raíz de mentira: preámbulo, documento y cuatro secciones. */
export const SAMPLE_MAIN = `\\documentclass[es]{cysec}
\\input{meta}

\\begin{document}
\\makewsheader

\\porque{pendiente}{%
  Nota de borrador que no llega al PDF final.%
}

\\input{sections/01-uno}
\\input{sections/02-dos}
\\input{sections/03-tres}
\\input{sections/04-cuatro}

\\printbibliography[title={Referencias},heading=bibliography]

\\end{document}
`

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

/** Todos los bloques del árbol, en orden de documento. */
export function flatten(blocks: Block[]): Block[] {
  const out: Block[] = []
  for (const block of blocks) {
    out.push(block)
    if (block.items) out.push(...flatten(block.items))
  }
  return out
}

/** Texto del cuerpo de un contenedor, con sus hijos dentro. */
export function bodyOf(text: string, block: Block): string {
  return text.slice(block.meta!.bodyFrom!, block.meta!.bodyTo!)
}
