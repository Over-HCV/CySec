import { describe, expect, it } from 'vitest'
import { TEMPLATE_FILES } from '../app/features/projects/lib/template.generated'
import {
  capturaConOpciones, CROP_CLASS_FILES, soportaRecorte, tieneAdjustbox
} from '../app/features/visual/lib/class-support'

/** La clase tal y como era antes del recorte: la que llevan los proyectos viejos. */
const VIEJA_PREAMBLE = '\\RequirePackage{graphicx}\n'
const VIEJA_BOXES = '\\newcommand{\\captura}[2]{%\n  \\includegraphics[width=0.8\\linewidth]{pics/#1}%\n}\n'

describe('tieneAdjustbox', () => {
  const PUESTO = '\\RequirePackage{adjustbox}\n\\let\\includegraphics\\adjincludegraphics\n'

  it('exige el paquete y el \\let, que es lo que da el trim relativo', () => {
    expect(tieneAdjustbox(PUESTO)).toBe(true)
    expect(tieneAdjustbox(PUESTO.replace('RequirePackage', 'usepackage'))).toBe(true)
    // Cargarlo a secas no cambia nada: `\includegraphics` sigue siendo el de
    // graphicx, que no entiende `0.1\width`.
    expect(tieneAdjustbox('\\RequirePackage{adjustbox}')).toBe(false)
    expect(tieneAdjustbox(VIEJA_PREAMBLE)).toBe(false)
  })
})

describe('capturaConOpciones', () => {
  it('distingue la macro de dos argumentos de la de tres con opcional', () => {
    expect(capturaConOpciones(VIEJA_BOXES)).toBe(false)
    expect(capturaConOpciones('\\newcommand{\\captura}[3][width=0.8\\linewidth]{%')).toBe(true)
  })
})

describe('soportaRecorte', () => {
  it('la plantilla de hoy lo soporta', () => {
    const [preamble, boxes] = CROP_CLASS_FILES
    expect(soportaRecorte(TEMPLATE_FILES[preamble!]!, TEMPLATE_FILES[boxes!]!)).toBe(true)
  })

  it('la clase de antes no, y hacen falta las dos cosas', () => {
    expect(soportaRecorte(VIEJA_PREAMBLE, VIEJA_BOXES)).toBe(false)
    expect(soportaRecorte(
      '\\RequirePackage{adjustbox}\n\\let\\includegraphics\\adjincludegraphics', VIEJA_BOXES)).toBe(false)
  })

  it('sin los archivos no se recorta', () => {
    expect(soportaRecorte(null, null)).toBe(false)
  })
})
