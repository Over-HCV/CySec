/**
 * El bloque de imagen: que el `figure` se lea entero y vuelva idéntico, y que
 * los nombres que se generan sean los que se prometen.
 *
 * Sacar `figure` de los entornos opacos es lo que más podía romper: hasta ahora
 * salía como un `raw` intacto, y un bloque hoja tiene que seguir siéndolo byte
 * a byte.
 */
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { parseTex } from '../app/features/visual/lib/parse-tex'
import { figureTemplate, specOf } from '../app/features/visual/lib/catalog'
import { applyFieldEdit, parseDoc } from '../app/features/visual/lib/doc-sync'
import { esTipoAceptado, plate, slug } from '../app/shared/lib/asset-name'
import { joined } from './fixtures'

const FIGURA = `\\section{Con imagen}

\\begin{figure}[htbp]
  \\centering
  \\includegraphics[width=0.8\\linewidth]{pics/QRT-482.png}
  \\caption{La captura del incidente}
  \\label{fig:QRT-482}
\\end{figure}

Un párrafo detrás.
`

function docWith(text: string) {
  const doc = new Y.Doc()
  const ytext = doc.getText('content')
  ytext.insert(0, text)
  return ytext
}

describe('parseo de un `figure`', () => {
  it('sale un solo bloque `figura` y la partición sigue cubriendo el archivo', () => {
    const blocks = parseTex(FIGURA)
    expect(blocks.filter(b => b.kind === 'figura')).toHaveLength(1)
    expect(joined(FIGURA, blocks)).toBe(FIGURA)
  })

  it('es un bloque hoja: no se parte en hijos, así que vuelve idéntico', () => {
    const figura = parseTex(FIGURA).find(b => b.kind === 'figura')!
    expect(figura.items).toBeUndefined()
    expect(FIGURA.slice(figura.span.from, figura.span.to))
      .toBe('\\begin{figure}[htbp]\n  \\centering\n'
        + '  \\includegraphics[width=0.8\\linewidth]{pics/QRT-482.png}\n'
        + '  \\caption{La captura del incidente}\n  \\label{fig:QRT-482}\n\\end{figure}')
  })

  it('los campos apuntan al pie, a la ruta y al número del ancho', () => {
    const figura = parseTex(FIGURA).find(b => b.kind === 'figura')!
    const campo = (name: string) => figura.fields.find(f => f.name === name)!
    expect(campo('pie').value).toBe('La captura del incidente')
    expect(campo('ruta').value).toBe('pics/QRT-482.png')
    // Solo el número: cambiar el ancho es un parche de tres caracteres, no
    // reescribir la macro entera.
    expect(campo('ancho').value).toBe('0.8')
    expect(FIGURA.slice(campo('ancho').span.from, campo('ancho').span.to)).toBe('0.8')
  })

  it('un `figure` sin `\\includegraphics` sigue siendo LaTeX crudo', () => {
    const tikz = `\\begin{figure}\n  \\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}\n\\end{figure}\n`
    const blocks = parseTex(tikz)
    expect(blocks.filter(b => b.kind === 'figura')).toHaveLength(0)
    expect(blocks[0]!.kind).toBe('raw')
    expect(joined(tikz, blocks)).toBe(tikz)
  })

  it('un `figure` sin pie se lee igual, y sin campo `pie`', () => {
    const suelto = `\\begin{figure}\n  \\includegraphics{pics/HKD-207.jpg}\n\\end{figure}\n`
    const figura = parseTex(suelto).find(b => b.kind === 'figura')!
    expect(figura.fields.map(f => f.name)).toEqual(['ruta'])
    expect(joined(suelto, parseTex(suelto))).toBe(suelto)
  })

  it('una imagen dentro de un entorno opaco no se marca como rota', () => {
    // `center` sale entero como `raw`, y el aviso de «falta cerrar una llave»
    // se comprueba también ahí dentro: `\\includegraphics` no puede estar en la
    // lista de macros conocidas o este idioma de toda la vida avisaría en falso.
    const centro = `\\begin{center}\n  \\includegraphics[width=6cm]{pics/ABC-234.png}\n\\end{center}\n`
    const blocks = parseTex(centro)
    expect(blocks.some(b => b.flags?.broken)).toBe(false)
    expect(joined(centro, blocks)).toBe(centro)
  })

  it('un `\\includegraphics` suelto también es una imagen, no un `raw` roto', () => {
    const suelto = `Antes.\n\n\\includegraphics[width=0.5\\linewidth]{pics/ABC-234.png}\n\nDespués.\n`
    const blocks = parseTex(suelto)
    const figura = blocks.find(b => b.kind === 'figura')!
    expect(figura.fields.find(f => f.name === 'ruta')!.value).toBe('pics/ABC-234.png')
    expect(blocks.some(b => b.flags?.broken)).toBe(false)
    expect(joined(suelto, blocks)).toBe(suelto)
  })
})

describe('editar una imagen', () => {
  it('cambiar el ancho toca tres caracteres y nada más', () => {
    const ytext = docWith(FIGURA)
    const figura = parseDoc(FIGURA, 'tex').find(b => b.kind === 'figura')!
    const ancho = figura.fields.find(f => f.name === 'ancho')!
    expect(applyFieldEdit(ytext, ancho, '1.0')).toBeNull()

    const after = ytext.toString()
    expect(after).toContain('\\includegraphics[width=1.0\\linewidth]{pics/QRT-482.png}')
    expect(after).toContain('\\label{fig:QRT-482}')
    expect(joined(after, parseDoc(after, 'tex'))).toBe(after)
  })

  it('cambiar la ruta no toca el pie ni la etiqueta', () => {
    const ytext = docWith(FIGURA)
    const figura = parseDoc(FIGURA, 'tex').find(b => b.kind === 'figura')!
    const ruta = figura.fields.find(f => f.name === 'ruta')!
    expect(applyFieldEdit(ytext, ruta, 'pics/HKD-207.jpg')).toBeNull()
    expect(ytext.toString()).toContain('{pics/HKD-207.jpg}')
    expect(ytext.toString()).toContain('\\caption{La captura del incidente}')
  })
})

describe('el LaTeX que se escribe al poner una imagen', () => {
  it('se lee de vuelta como el bloque que lo escribió', () => {
    // El `|` es la marca de cursor de `insertBlock`; el documento no lo lleva.
    const latex = figureTemplate('pics/QRT-482.png', 'QRT-482').replace('|', '')
    const figura = parseTex(latex).find(b => b.kind === 'figura')!
    expect(figura.fields.find(f => f.name === 'ruta')!.value).toBe('pics/QRT-482.png')
    expect(latex).toContain('\\label{fig:QRT-482}')
    expect(joined(latex, parseTex(latex))).toBe(latex)
  })

  it('«Imagen» está en el catálogo y no lleva plantilla propia', () => {
    // No puede: hasta que el archivo no está subido no hay ruta que escribir.
    expect(specOf('figura').label).toBe('Imagen')
    expect(specOf('figura').template).toBeUndefined()
  })
})

describe('nombres de archivo', () => {
  it('la matrícula no usa las letras ni las cifras que se confunden', () => {
    for (let i = 0; i < 500; i++) {
      const nombre = plate()
      expect(nombre).toMatch(/^[A-Z]{3}-[0-9]{3}$/)
      expect(nombre).not.toMatch(/[IO01]/)
    }
  })

  it('el nombre escrito a mano pierde lo que rompería el `\\includegraphics`', () => {
    expect(slug('Mi Captura.png')).toBe('mi-captura-png')
    expect(slug('../../etc/passwd')).toBe('etc-passwd')
    expect(slug('diagrama de red')).toBe('diagrama-de-red')
    expect(slug('Ámbito ñ')).toBe('ambito-n')
    expect(slug('!!!')).toBe('')
  })

  it('solo se aceptan los formatos que el compilador sabe incluir', () => {
    expect(esTipoAceptado('image/png')).toBe(true)
    expect(esTipoAceptado('image/jpeg')).toBe(true)
    expect(esTipoAceptado('application/pdf')).toBe(true)
    expect(esTipoAceptado('image/webp')).toBe(false)
    expect(esTipoAceptado('image/gif')).toBe(false)
    // Un archivo sin tipo no puede colarse por ser cadena vacía.
    expect(esTipoAceptado('')).toBe(false)
  })
})
