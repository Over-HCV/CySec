import { describe, expect, it } from 'vitest'
import { collect, diskSource } from '../scripts/build-template'
import { TEMPLATE_FILES, TEMPLATE_ROOT } from '../app/features/projects/lib/template.generated'

// La fuente es el `latex/` del repo del curso, que desde la separación de
// repositorios puede no estar en esta máquina. Se compara solo contra el disco:
// leerlo de GitHub metería la red —y su latencia y sus caídas— en una suite que
// se presume offline. Sin clon al lado, esa comparación se salta; las demás
// comprobaciones miran la copia generada y siguen valiendo.
const source = await diskSource()

describe('plantilla de proyecto nuevo', () => {
  it.skipIf(!source)('coincide con lo que hay en latex/ ahora mismo', async () => {
    // Si esto falla, alguien cambió la clase o la plantilla del repo y la copia
    // que usa «Nuevo proyecto» se quedó vieja. Se arregla regenerándola:
    //   node --experimental-strip-types scripts/build-template.ts
    expect(TEMPLATE_FILES).toEqual(await collect(source!))
  })

  it('trae la capa compartida y el taller, que es lo que hace falta para compilar', () => {
    const paths = Object.keys(TEMPLATE_FILES)
    expect(paths).toContain('tex/cysec.cls')
    expect(paths).toContain('tex/common/preamble.tex')
    expect(paths).toContain('tex/bib/refs.bib')
    expect(paths).toContain('latexmkrc')
    expect(paths).toContain(TEMPLATE_ROOT)
    expect(paths).toContain('meta.tex')
  })

  it('el raíz declara la clase del curso y trae sus metadatos', () => {
    const main = TEMPLATE_FILES[TEMPLATE_ROOT]!
    expect(main).toContain('\\documentclass[es]{cysec}')
    expect(main).toContain('\\input{meta}')
    expect(TEMPLATE_FILES['meta.tex']).toContain('\\wstitle{')
  })

  it('el taller vive en la raíz: \\input{meta} resuelve sin trucos', () => {
    // Si el taller colgara de `workshops/ws-01/`, `\input{meta}` buscaría en la
    // raíz del proyecto y el documento no compilaría salvo que el compilador
    // entre antes en esa carpeta.
    expect(TEMPLATE_ROOT).toBe('main.tex')
    expect(Object.keys(TEMPLATE_FILES)).toContain('sections/01-seccion.tex')
  })

  it('el latexmkrc apunta a tex/, que es donde vive la clase', () => {
    expect(TEMPLATE_FILES.latexmkrc).toContain("ensure_path('TEXINPUTS'")
  })

  it('ninguna ruta rompería el check de la tabla files', () => {
    for (const path of Object.keys(TEMPLATE_FILES)) {
      expect(path.startsWith('/')).toBe(false)
      expect(path).not.toContain('..')
      expect(path.length).toBeLessThanOrEqual(400)
    }
  })
})
