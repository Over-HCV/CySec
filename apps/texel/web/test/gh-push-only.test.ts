import { describe, expect, it } from 'vitest'
import { blobSha, classify } from '../server/utils/gh/diff'
import { commitCandidates } from '../server/utils/gh/sync'

const A = blobSha('a')
const B = blobSha('b')
const C = blobSha('c')

function map(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries))
}

// Dos archivos cambiados aquí (ahead) y uno en conflicto.
const status = classify(
  map({ 'a.tex': B, 'b.tex': B, 'c.tex': B }), // local
  map({ 'a.tex': A, 'b.tex': A, 'c.tex': C }), // remote
  map({ 'a.tex': A, 'b.tex': A, 'c.tex': A })  // base
)

function paths(set: ReturnType<typeof commitCandidates>): string[] {
  return set.map(c => c.path).sort()
}

describe('selección de lo que entra en el commit (stage)', () => {
  it('sin stage: todo lo de aquí, pero el conflicto solo si se fuerza', () => {
    expect(paths(commitCandidates(status, new Set()))).toEqual(['a.tex', 'b.tex'])
    expect(paths(commitCandidates(status, new Set(['c.tex'])))).toEqual(['a.tex', 'b.tex', 'c.tex'])
  })

  it('con stage: solo las rutas preparadas', () => {
    expect(paths(commitCandidates(status, new Set(), new Set(['a.tex'])))).toEqual(['a.tex'])
    // b.tex queda fuera del commit aunque sea un cambio de aquí: sigue pendiente.
    expect(paths(commitCandidates(status, new Set(), new Set(['a.tex'])))).not.toContain('b.tex')
  })

  it('un conflicto solo se commitea si está preparado Y forzado a favor de aquí', () => {
    // preparado pero sin forzar ⇒ no es candidato (no está en ahead ni en forced)
    expect(paths(commitCandidates(status, new Set(), new Set(['c.tex'])))).toEqual([])
    // preparado y forzado ⇒ entra
    expect(paths(commitCandidates(status, new Set(['c.tex']), new Set(['a.tex', 'c.tex']))))
      .toEqual(['a.tex', 'c.tex'])
  })

  it('un stage vacío no commitea nada', () => {
    expect(commitCandidates(status, new Set(['c.tex']), new Set())).toHaveLength(0)
  })
})
