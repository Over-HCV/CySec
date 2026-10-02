import { describe, expect, it } from 'vitest'
import { restorePlan } from '../server/utils/gh/sync'

describe('plan de restore (descartar cambios locales)', () => {
  const remote = new Set(['mod.tex', 'conflict.tex'])          // existe en el repo
  const local = new Set(['mod.tex', 'conflict.tex', 'nuevo.tex']) // existe en el proyecto
  const remoteHas = (p: string) => remote.has(p)
  const localHas = (p: string) => local.has(p)

  it('lo que el repo tiene se restaura; lo que solo existe aquí se borra', () => {
    const plan = restorePlan(['mod.tex', 'nuevo.tex'], remoteHas, localHas)
    expect(plan.restore).toEqual(['mod.tex'])
    expect(plan.remove).toEqual(['nuevo.tex'])
  })

  it('un conflicto se restaura a la versión del repo', () => {
    const plan = restorePlan(['conflict.tex'], remoteHas, localHas)
    expect(plan.restore).toEqual(['conflict.tex'])
    expect(plan.remove).toEqual([])
  })

  it('una ruta que no está ni aquí ni en el repo no hace nada', () => {
    const plan = restorePlan(['fantasma.tex'], remoteHas, localHas)
    expect(plan.restore).toEqual([])
    expect(plan.remove).toEqual([])
  })

  it('rutas repetidas se tratan una sola vez', () => {
    const plan = restorePlan(['mod.tex', 'mod.tex'], remoteHas, localHas)
    expect(plan.restore).toEqual(['mod.tex'])
  })
})
