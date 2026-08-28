import { describe, expect, it } from 'vitest'
import { blobSha, classify, isClean, summarize } from '../server/utils/gh/diff'

const A = blobSha('a')
const B = blobSha('b')
const C = blobSha('c')

function map(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries))
}

describe('sha de blob', () => {
  it('es el de git', () => {
    // `printf '' | git hash-object --stdin` y `printf 'hola\n' | git hash-object --stdin`
    expect(blobSha('')).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
    expect(blobSha('hola\n')).toBe('5c1b14949828006ed75a3e8858957f86a2f7e2eb')
  })

  it('texto y bytes con el mismo contenido dan el mismo sha', () => {
    expect(blobSha(new TextEncoder().encode('hola\n'))).toBe(blobSha('hola\n'))
  })
})

describe('clasificación a tres bandas', () => {
  it('lo idéntico no genera trabajo', () => {
    const status = classify(map({ 'main.tex': A }), map({ 'main.tex': A }), map({ 'main.tex': A }))
    expect(isClean(status)).toBe(true)
    expect(summarize(status)).toBe('al día')
  })

  it('cambió solo en el repo: se baja', () => {
    const status = classify(map({ 'main.tex': A }), map({ 'main.tex': B }), map({ 'main.tex': A }))
    expect(status.behind.map(c => [c.path, c.action])).toEqual([['main.tex', 'pull']])
    expect(status.ahead).toHaveLength(0)
  })

  it('cambió solo en el proyecto: se sube', () => {
    const status = classify(map({ 'main.tex': B }), map({ 'main.tex': A }), map({ 'main.tex': A }))
    expect(status.ahead.map(c => [c.path, c.action])).toEqual([['main.tex', 'push']])
  })

  it('cambió en los dos: conflicto, y no aparece en ninguna de las dos listas', () => {
    const status = classify(map({ 'main.tex': B }), map({ 'main.tex': C }), map({ 'main.tex': A }))
    expect(status.conflicts.map(c => c.path)).toEqual(['main.tex'])
    expect(status.ahead).toHaveLength(0)
    expect(status.behind).toHaveLength(0)
  })

  it('borrado en el repo se propaga como borrado', () => {
    const status = classify(map({ 'viejo.tex': A }), map({}), map({ 'viejo.tex': A }))
    expect(status.behind.map(c => c.action)).toEqual(['pull-delete'])
  })

  it('borrado en el proyecto se propaga como borrado', () => {
    const status = classify(map({}), map({ 'viejo.tex': A }), map({ 'viejo.tex': A }))
    expect(status.ahead.map(c => c.action)).toEqual(['push-delete'])
  })

  it('borrado aquí pero modificado allí es conflicto', () => {
    const status = classify(map({}), map({ 'main.tex': B }), map({ 'main.tex': A }))
    expect(status.conflicts.map(c => c.path)).toEqual(['main.tex'])
  })

  it('borrado en los dos sitios no es nada', () => {
    expect(isClean(classify(map({}), map({}), map({ 'ido.tex': A })))).toBe(true)
  })

  it('archivo nuevo en un solo lado se mueve hacia el otro', () => {
    expect(classify(map({ 'nuevo.tex': A }), map({}), map({})).ahead.map(c => c.action)).toEqual(['push'])
    expect(classify(map({}), map({ 'nuevo.tex': A }), map({})).behind.map(c => c.action)).toEqual(['pull'])
  })

  it('dos archivos nuevos distintos con la misma ruta son conflicto', () => {
    // Sin base no hay forma de saber cuál desciende de cuál: quedarse con uno
    // en silencio perdería el otro.
    const status = classify(map({ 'main.tex': A }), map({ 'main.tex': B }), map({}))
    expect(status.conflicts.map(c => c.path)).toEqual(['main.tex'])
  })

  it('mismo contenido en los dos lados no es conflicto aunque la base esté vieja', () => {
    expect(isClean(classify(map({ 'main.tex': B }), map({ 'main.tex': B }), map({ 'main.tex': A })))).toBe(true)
  })

  it('el resumen cuenta las tres cosas', () => {
    const status = classify(
      map({ 'a.tex': B, 'b.tex': A, 'c.tex': B }),
      map({ 'a.tex': A, 'b.tex': C, 'c.tex': C }),
      map({ 'a.tex': A, 'b.tex': A, 'c.tex': A })
    )
    expect(summarize(status)).toBe('1 por subir · 1 por bajar · 1 en conflicto')
  })
})
