import { describe, expect, it } from 'vitest'
import {
  defaultPathMap, syncSkipReason, toProjectPath, toRepoPath, type PathRule
} from '../server/utils/gh/mapping'

const MAP = defaultPathMap('latex/workshops/ws-01')

describe('mapa por defecto de un taller', () => {
  it('el taller cuelga de su carpeta en el repo', () => {
    expect(toRepoPath('main.tex', MAP)?.path).toBe('latex/workshops/ws-01/main.tex')
    expect(toRepoPath('sections/02-integridad.tex', MAP)?.path)
      .toBe('latex/workshops/ws-01/sections/02-integridad.tex')
  })

  it('la capa compartida va a latex/tex/, no dentro del taller', () => {
    // Si esta regla perdiera contra la de la raíz, cada taller subiría su propia
    // copia de la clase del curso y dejarían de compartirla.
    expect(toRepoPath('tex/cysec.cls', MAP)?.path).toBe('latex/tex/cysec.cls')
    expect(toRepoPath('tex/common/preamble.tex', MAP)?.path).toBe('latex/tex/common/preamble.tex')
    expect(toRepoPath('tex/bib/refs.bib', MAP)?.path).toBe('latex/tex/bib/refs.bib')
  })

  it('un archivo suelto se nombra entero', () => {
    expect(toRepoPath('latexmkrc', MAP)?.path).toBe('latex/latexmkrc')
  })

  it('la vuelta deshace la ida', () => {
    for (const path of ['main.tex', 'meta.tex', 'sections/01-a.tex', 'tex/cysec.cls', 'latexmkrc']) {
      expect(toProjectPath(toRepoPath(path, MAP)!.path, MAP)?.path).toBe(path)
    }
  })

  it('lo de fuera del mapa no entra', () => {
    expect(toProjectPath('README.md', MAP)).toBeNull()
    expect(toProjectPath('latex/workshops/ws-02/main.tex', MAP)).toBeNull()
    expect(toProjectPath('theory/redes.md', MAP)).toBeNull()
  })

  it('una ruta que bajaría a un sitio y subiría a otro se descarta', () => {
    // `latex/workshops/ws-01/tex/x` daría `tex/x`, que al subir iría a
    // `latex/tex/x`. Aceptarla duplicaría el archivo en cada sincronización.
    expect(toProjectPath('latex/workshops/ws-01/tex/cysec.cls', MAP)).toBeNull()
  })

  it('la carpeta del taller a secas no es un archivo', () => {
    expect(toProjectPath('latex/workshops/ws-01', MAP)).toBeNull()
  })
})

describe('mapas a medida', () => {
  it('sin regla de raíz, lo que no case se queda fuera', () => {
    const rules: PathRule[] = [{ project: 'tex/', repo: 'latex/tex/' }]
    expect(toRepoPath('tex/cysec.cls', rules)?.path).toBe('latex/tex/cysec.cls')
    expect(toRepoPath('main.tex', rules)).toBeNull()
  })

  it('las barras sobrantes dan igual', () => {
    const rules = defaultPathMap('/latex/workshops/ws-01/')
    expect(toRepoPath('main.tex', rules)?.path).toBe('latex/workshops/ws-01/main.tex')
    expect(toProjectPath('latex/workshops/ws-01/main.tex', rules)?.path).toBe('main.tex')
  })

  it('el proyecto puede mapear a la raíz del repo', () => {
    const rules: PathRule[] = [{ project: '', repo: '' }]
    expect(toRepoPath('main.tex', rules)?.path).toBe('main.tex')
    expect(toProjectPath('main.tex', rules)?.path).toBe('main.tex')
  })
})

describe('qué archivos entran', () => {
  it('los subproductos de compilar no se sincronizan en ninguna dirección', () => {
    expect(syncSkipReason('main.aux')).toBe('subproducto de compilar')
    expect(syncSkipReason('main.synctex.gz')).toBe('subproducto de compilar')
    expect(syncSkipReason('build/main.pdf')).toBe('carpeta de trabajo')
    expect(syncSkipReason('.git/config')).toBe('carpeta de trabajo')
  })

  it('lo que sí es del documento entra', () => {
    expect(syncSkipReason('main.tex')).toBeNull()
    expect(syncSkipReason('sections/01-a.tex')).toBeNull()
    expect(syncSkipReason('tex/bib/refs.bib')).toBeNull()
    expect(syncSkipReason('img/diagrama.png', 2048)).toBeNull()
    expect(syncSkipReason('latexmkrc')).toBeNull()
  })

  it('un archivo enorme se queda fuera', () => {
    expect(syncSkipReason('img/foto.png', 9 * 1024 * 1024)).toContain('pasa de')
  })
})
