import { describe, expect, it } from 'vitest'
import { formatTex, minimalPatch } from '../app/features/editor/lib/format-tex'
import { hasRepo, repoFile, SECTIONS, WS01 } from './fixtures'

const FILES = [...SECTIONS, `${WS01}/main.tex`, `${WS01}/meta.tex`]

/** Lo que le llega a LaTeX: el texto sin los espacios que no imprime. */
function significant(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .join('\n')
}

describe.skipIf(!hasRepo)('formatTex sobre los archivos reales', () => {
  for (const path of FILES) {
    const text = repoFile(path)

    it(`${path}: no cambia lo que se compila`, () => {
      expect(significant(formatTex(text))).toBe(significant(text))
    })

    it(`${path}: formatear dos veces da lo mismo que una`, () => {
      const once = formatTex(text)
      expect(formatTex(once)).toBe(once)
    })
  }
})

describe.skipIf(!hasRepo)('formatTex', () => {
  it('quita espacios al final y deja un salto final', () => {
    expect(formatTex('\\section{a}   \n\\section{b}')).toBe('\\section{a}\n\\section{b}\n')
  })

  it('colapsa las líneas en blanco de más', () => {
    expect(formatTex('uno\n\n\n\n\ndos\n')).toBe('uno\n\ndos\n')
  })

  it('indenta por nivel de entorno, pero no por document', () => {
    const text = '\\begin{document}\n\\begin{caso}{t}\ntexto\n\\end{caso}\n\\end{document}\n'
    expect(formatTex(text)).toBe(
      '\\begin{document}\n\\begin{caso}{t}\n  texto\n\\end{caso}\n\\end{document}\n'
    )
  })

  it('no toca lo que hay dentro de verbatim', () => {
    const text = '\\begin{verbatim}\n   a   \n     b\n\\end{verbatim}\n'
    expect(formatTex(text)).toBe(text)
  })

  it('respeta la alineación a mano de una tabla', () => {
    const text = '\\begin{tabular}{ll}\n  a  &  b \\\\\n  c  &  d \\\\\n\\end{tabular}\n'
    expect(formatTex(text)).toBe(text)
  })

  it('un entorno abierto y cerrado en la misma línea no indenta', () => {
    expect(formatTex('\\begin{mio}x\\end{mio}\nsigue\n')).toBe('\\begin{mio}x\\end{mio}\nsigue\n')
  })

  it('un \\begin comentado no cuenta', () => {
    expect(formatTex('% \\begin{caso}\ntexto\n')).toBe('% \\begin{caso}\ntexto\n')
  })

  it('el archivo vacío se queda vacío', () => {
    expect(formatTex('')).toBe('')
    expect(formatTex('\n\n\n')).toBe('')
  })
})

describe.skipIf(!hasRepo)('minimalPatch', () => {
  it('sin cambios, no hay parche', () => {
    expect(minimalPatch('igual', 'igual')).toBeNull()
  })

  it('solo describe el tramo que cambia', () => {
    expect(minimalPatch('hola mundo', 'hola Mundo')).toEqual({ from: 5, remove: 1, insert: 'M' })
  })

  it('aplicar el parche reproduce el texto nuevo', () => {
    // Se ensucia a propósito: si el archivo del repo ya está formateado
    // —lo normal, porque ⌘S lo formatea— no habría parche que aplicar y el
    // test no probaría nada.
    const antes = `${repoFile(SECTIONS[0]!)}   \n\n\n`
    const despues = formatTex(antes)
    expect(despues).not.toBe(antes)
    const patch = minimalPatch(antes, despues)!

    const aplicado = antes.slice(0, patch.from) + patch.insert + antes.slice(patch.from + patch.remove)
    expect(aplicado).toBe(despues)
  })

  it('una inserción pura no borra nada', () => {
    expect(minimalPatch('ab', 'axb')).toEqual({ from: 1, remove: 0, insert: 'x' })
  })

  it('un borrado puro no inserta nada', () => {
    expect(minimalPatch('axb', 'ab')).toEqual({ from: 1, remove: 1, insert: '' })
  })
})
