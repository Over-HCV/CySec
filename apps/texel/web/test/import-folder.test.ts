import { describe, expect, it } from 'vitest'
import {
  guessEngine, MAX_FILE_BYTES, missingSharedLayer, pickRoot, planImport
} from '../app/features/projects/lib/import-folder'
import { TEMPLATE_FILES } from '../app/features/projects/lib/template.generated'

/** Un `File` de mentira con el tamaño que haga falta, sin tocar el disco. */
function entry(relativePath: string, content = 'x', size?: number) {
  const file = new File([content], relativePath.split('/').pop()!)
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size })
  return { relativePath, file }
}

describe('planImport', () => {
  it('conserva las subcarpetas y quita la carpeta elegida', () => {
    const plan = planImport([
      entry('ws-01/main.tex'),
      entry('ws-01/sections/01-confidencialidad.tex'),
      entry('ws-01/bib/refs.bib')
    ])

    expect(plan.name).toBe('ws-01')
    expect(plan.texts.map(t => t.path)).toEqual([
      'main.tex', 'sections/01-confidencialidad.tex', 'bib/refs.bib'
    ])
    expect(plan.skipped).toHaveLength(0)
  })

  it('separa binarios de texto', () => {
    const plan = planImport([
      entry('p/main.tex'),
      entry('p/img/diagrama.png'),
      entry('p/fuentes/Inter.otf')
    ])

    expect(plan.texts.map(t => t.path)).toEqual(['main.tex'])
    expect(plan.binaries.map(b => b.path)).toEqual(['img/diagrama.png', 'fuentes/Inter.otf'])
  })

  it('descarta basura de compilar, carpetas de trabajo y ocultos', () => {
    const plan = planImport([
      entry('p/main.tex'),
      entry('p/main.aux'),
      entry('p/main.synctex.gz'),
      entry('p/main.run.xml'),
      entry('p/.git/config'),
      entry('p/node_modules/paquete/index.js'),
      entry('p/.DS_Store')
    ])

    expect(plan.texts.map(t => t.path)).toEqual(['main.tex'])
    expect(plan.binaries).toHaveLength(0)
    expect(plan.skipped.map(s => s.path)).toContain('main.aux')
    expect(plan.skipped.map(s => s.path)).toContain('.git/config')
  })

  it('conserva .latexmkrc, que sí afecta a la compilación', () => {
    const plan = planImport([entry('p/.latexmkrc')])
    expect(plan.skipped).toHaveLength(0)
    expect(plan.binaries.map(b => b.path)).toEqual(['.latexmkrc'])
  })

  it('descarta lo que la tabla `files` rechazaría', () => {
    const largo = `p/${'a'.repeat(401)}.tex`
    const plan = planImport([entry(largo), entry('p/../fuera.tex')])
    expect(plan.texts).toHaveLength(0)
    expect(plan.skipped.map(s => s.reason)).toContain('ruta demasiado larga')
    expect(plan.skipped.map(s => s.reason)).toContain('ruta no permitida')
  })

  it('descarta archivos demasiado grandes', () => {
    const plan = planImport([entry('p/enorme.png', 'x', MAX_FILE_BYTES + 1)])
    expect(plan.binaries).toHaveLength(0)
    expect(plan.skipped[0]!.reason).toContain('MB')
  })
})

describe('pickRoot', () => {
  it('prefiere main.tex', () => {
    expect(pickRoot([
      { path: 'otro.tex', content: '\\documentclass{article}' },
      { path: 'main.tex', content: 'hola' }
    ])).toBe('main.tex')
  })

  it('sin main.tex en la raíz, el main.tex más superficial que no sea plantilla', () => {
    expect(pickRoot([
      { path: 'tex/common/macros.tex', content: '\\documentclass' },
      { path: 'workshops/_template/main.tex', content: '\\documentclass[es]{cysec}' },
      { path: 'workshops/ws-01/main.tex', content: '\\documentclass[es]{cysec}' }
    ])).toBe('workshops/ws-01/main.tex')
  })

  it('si no hay main.tex, el que declare la clase', () => {
    expect(pickRoot([
      { path: 'sections/01.tex', content: '\\section{a}' },
      { path: 'taller.tex', content: '\\documentclass[es]{cysec}' }
    ])).toBe('taller.tex')
  })

  it('sin ningún .tex no hay raíz', () => {
    expect(pickRoot([{ path: 'refs.bib', content: '@book{a}' }])).toBeNull()
  })
})

describe('missingSharedLayer', () => {
  /** Lo que trae una carpeta `workshops/ws-01/` recién arrastrada. */
  const taller = [
    { path: 'main.tex', content: '\\documentclass[es]{cysec}\n\\input{meta}' },
    { path: 'meta.tex', content: '\\wsnumber{1}' },
    { path: 'sections/01-confidencialidad.tex', content: '\\section{a}' }
  ]

  it('un taller sin la clase se completa con tex/** y el latexmkrc', () => {
    const layer = missingSharedLayer(taller, TEMPLATE_FILES)
    const paths = Object.keys(layer)

    expect(paths).toContain('tex/cysec.cls')
    expect(paths).toContain('tex/common/preamble.tex')
    expect(paths).toContain('tex/bib/refs.bib')
    expect(paths).toContain('latexmkrc')
    // Sin el latexmkrc, TEXINPUTS no apunta a tex/ y la clase seguiría perdida.
    expect(layer['tex/cysec.cls']).toContain('ProvidesClass{cysec}')
  })

  it('si la carpeta ya trae la clase, no se toca nada', () => {
    const layer = missingSharedLayer([
      { path: 'workshops/ws-01/main.tex', content: '\\documentclass[es]{cysec}' },
      { path: 'tex/cysec.cls', content: '%% cysec.cls' },
      { path: 'latexmkrc', content: '$pdf_mode = 5;' }
    ], TEMPLATE_FILES)

    expect(layer).toEqual({})
  })

  it('respeta el latexmkrc del usuario', () => {
    const propio = missingSharedLayer(
      [...taller, { path: 'latexmkrc', content: '$pdf_mode = 1;' }],
      TEMPLATE_FILES
    )
    expect(Object.keys(propio)).toContain('tex/cysec.cls')
    expect(propio.latexmkrc).toBeUndefined()

    // El `.latexmkrc` entra como binario, sin contenido, y vale igual.
    const oculto = missingSharedLayer([...taller, { path: '.latexmkrc' }], TEMPLATE_FILES)
    expect(oculto.latexmkrc).toBeUndefined()
  })

  it('un artículo normal no necesita nada', () => {
    const layer = missingSharedLayer([
      { path: 'main.tex', content: '\\documentclass{article}\n\\begin{document}\\end{document}' }
    ], TEMPLATE_FILES)

    expect(layer).toEqual({})
  })
})

describe('guessEngine', () => {
  it('la directiva del archivo manda', () => {
    expect(guessEngine('% !TEX program = lualatex\n\\documentclass{article}')).toBe('lualatex')
  })

  it('fontspec o la clase del curso piden xelatex', () => {
    expect(guessEngine('\\usepackage{fontspec}')).toBe('xelatex')
    expect(guessEngine('\\documentclass[es]{cysec}')).toBe('xelatex')
  })

  it('un artículo normal se compila con pdflatex', () => {
    expect(guessEngine('\\documentclass{article}\n\\begin{document}\\end{document}')).toBe('pdflatex')
  })
})
