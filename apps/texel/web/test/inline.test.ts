import { describe, expect, it } from 'vitest'
import {
  isProse, parseInline, plainText, serializeInline, type InlineNode
} from '../app/features/visual/lib/inline'
import { parseTex } from '../app/features/visual/lib/parse-tex'
import { flatten, repoFile, SECTIONS, WS01 } from './fixtures'

const FILES = [...SECTIONS, `${WS01}/main.tex`, `${WS01}/meta.tex`]

/** Ida y vuelta: serializar lo parseado devuelve el texto original, byte a byte. */
function roundTrip(latex: string): string {
  return serializeInline(parseInline(latex))
}

describe('ida y vuelta sobre los archivos reales', () => {
  for (const path of FILES) {
    const text = repoFile(path)

    it(`${path}: cada campo vuelve idéntico`, () => {
      for (const block of flatten(parseTex(text))) {
        for (const field of block.fields) {
          expect(roundTrip(field.value), `${block.kind}.${field.name}`).toBe(field.value)
        }
      }
    })

    it(`${path}: cada tramo del archivo vuelve idéntico`, () => {
      // Trocear por líneas y por párrafos cubre mucho más que los campos: pilla
      // la prosa suelta, los comentarios y los entornos.
      for (const chunk of text.split('\n')) {
        expect(roundTrip(chunk), JSON.stringify(chunk)).toBe(chunk)
      }
      expect(roundTrip(text)).toBe(text)
    })
  }
})

describe('parseInline', () => {
  it('reconoce las tres marcas', () => {
    const nodes = parseInline('normal \\textbf{gorda} \\emph{tumbada} \\texttt{código}')
    expect(nodes.filter(n => n.kind === 'mark').map(n => (n as { mark: string }).mark))
      .toEqual(['bold', 'italic', 'code'])
  })

  it('recuerda con qué macro se escribió, para devolverla igual', () => {
    const [nodo] = parseInline('\\term{cifrado}') as [InlineNode]
    expect(nodo).toMatchObject({ kind: 'mark', mark: 'bold', cmd: 'term' })
    expect(roundTrip('\\term{cifrado}')).toBe('\\term{cifrado}')
    expect(roundTrip('\\eng{firewall}')).toBe('\\eng{firewall}')
  })

  it('anida marcas', () => {
    const latex = '\\texttt{\\textbackslash opcion*}'
    expect(plainText(parseInline(latex))).toBe('\\opcion*')
    expect(roundTrip(latex)).toBe(latex)
  })

  it('convierte los escapes en el carácter que representan', () => {
    expect(plainText(parseInline('100\\% de \\_esto\\_ y \\&aquello'))).toBe('100% de _esto_ y &aquello')
    expect(roundTrip('100\\% de \\_esto\\_ y \\&aquello')).toBe('100\\% de \\_esto\\_ y \\&aquello')
  })

  it('un macro desconocido se queda entero y opaco', () => {
    const nodes = parseInline('ver \\cite{togaf92} y ya')
    const opaco = nodes.find(n => n.kind === 'opaque')!
    expect(opaco).toMatchObject({ kind: 'opaque', source: '\\cite{togaf92}', label: '\\cite' })
    expect(roundTrip('ver \\cite{togaf92} y ya')).toBe('ver \\cite{togaf92} y ya')
  })

  it('un comentario se conserva y no se imprime', () => {
    const latex = 'texto.% cola del argumento\nsigue'
    expect(plainText(parseInline(latex))).toBe('texto.\nsigue')
    expect(roundTrip(latex)).toBe(latex)
  })

  it('una marca sin cerrar no se inventa el final', () => {
    const latex = '\\textbf{sin cerrar'
    expect(parseInline(latex).some(n => n.kind === 'mark')).toBe(false)
    expect(roundTrip(latex)).toBe(latex)
  })

  it('respeta las llaves escapadas dentro de una marca', () => {
    const latex = '\\texttt{una \\{ y otra \\}}'
    expect(roundTrip(latex)).toBe(latex)
  })

  it('el % dentro de una marca de código es literal, no comentario', () => {
    const latex = '\\texttt{100\\% seguro}'
    expect(roundTrip(latex)).toBe(latex)
    expect(plainText(parseInline(latex))).toBe('100% seguro')
  })
})

describe('isProse', () => {
  it('sí para prosa con marcas', () => {
    expect(isProse('Un texto con \\textbf{negrita} y \\texttt{código}.')).toBe(true)
    expect(isProse('Texto con nota.% y un comentario\n')).toBe(true)
  })

  it('no para LaTeX de estructura', () => {
    expect(isProse('\\makewsheader')).toBe(false)
    expect(isProse('\\printbibliography[title={Referencias}]')).toBe(false)
    expect(isProse('\\begin{table}\n\\end{table}')).toBe(false)
  })

  it('no para el vacío', () => {
    expect(isProse('')).toBe(false)
    expect(isProse('\n  \n')).toBe(false)
  })
})
