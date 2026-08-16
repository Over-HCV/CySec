/**
 * Catálogo de bloques: qué se ve en la interfaz para cada tipo y qué LaTeX se
 * escribe al crear uno nuevo.
 *
 * Sale de `latex/tex/common/boxes.tex` y `latex/tex/common/macros.tex`, no de la
 * memoria. Si allí cambia una firma, aquí hay que cambiarla también.
 */
import type { BlockKind, DocKind } from './types'

export interface FieldSpec {
  name: string
  label: string
  /** Área de texto en vez de una línea. */
  multiline?: boolean
  placeholder?: string
}

export interface BlockSpec {
  kind: BlockKind
  label: string
  /** Nombre del icono de `lucide-vue-next`. */
  icon: string
  hint: string
  fields: FieldSpec[]
  /** LaTeX que se inserta al crear el bloque. `|` marca dónde va el cursor. */
  template?: string
  /** En qué tipo de archivo tiene sentido ofrecerlo. */
  doc: DocKind
}

export const CATALOG: BlockSpec[] = [
  {
    kind: 'section',
    label: 'Sección',
    icon: 'Heading',
    hint: 'Título de sección o subsección',
    doc: 'tex',
    fields: [{ name: 'titulo', label: 'Título' }],
    template: '\\section{|}\n\n'
  },
  {
    kind: 'caso',
    label: 'Caso de estudio',
    icon: 'Briefcase',
    hint: 'Enunciado del caso que hay que investigar',
    doc: 'tex',
    fields: [
      { name: 'titulo', label: 'Título' },
      { name: 'cuerpo', label: 'Enunciado', multiline: true }
    ],
    template: '\\begin{caso}{|}\n\n\\end{caso}\n\n'
  },
  {
    kind: 'fuentes',
    label: 'Fuentes',
    icon: 'Link',
    hint: 'Lista de enlaces del enunciado',
    doc: 'tex',
    fields: [],
    template: '\\begin{fuentes}\n  \\fuente{|}\n\\end{fuentes}\n\n'
  },
  {
    kind: 'fuente',
    label: 'Fuente',
    icon: 'Link',
    hint: 'Un enlace dentro de la lista de fuentes',
    doc: 'tex',
    fields: [{ name: 'url', label: 'URL', placeholder: 'https://…' }],
    template: '  \\fuente{|}\n'
  },
  {
    kind: 'pregunta',
    label: 'Pregunta',
    icon: 'HelpCircle',
    hint: 'Pregunta abierta, numerada automáticamente',
    doc: 'tex',
    fields: [{ name: 'enunciado', label: 'Enunciado', multiline: true }],
    template: '\\pregunta{|}\n\\begin{respuesta}\n\\end{respuesta}\n\n'
  },
  {
    kind: 'respuesta',
    label: 'Respuesta',
    icon: 'MessageSquare',
    hint: 'Si se deja vacía, el PDF avisa de que está pendiente',
    doc: 'tex',
    fields: [{ name: 'cuerpo', label: 'Respuesta', multiline: true }],
    template: '\\begin{respuesta}\n|\n\\end{respuesta}\n\n'
  },
  {
    kind: 'mcq',
    label: 'Selección múltiple',
    icon: 'ListChecks',
    hint: 'Enunciado con opciones; marca las correctas',
    doc: 'tex',
    fields: [{ name: 'enunciado', label: 'Enunciado', multiline: true }],
    template: '\\begin{mcq}{|}\n  \\opcion{}\n  \\opcion{}\n\\end{mcq}\n\n'
  },
  {
    kind: 'opcion',
    label: 'Opción',
    icon: 'Circle',
    hint: 'Una opción de selección múltiple',
    doc: 'tex',
    fields: [{ name: 'texto', label: 'Texto', multiline: true }],
    template: '  \\opcion{|}\n'
  },
  {
    kind: 'porque',
    label: 'Nota de borrador',
    icon: 'StickyNote',
    hint: 'Desaparece del PDF final',
    doc: 'tex',
    fields: [
      { name: 'titulo', label: 'Título' },
      { name: 'texto', label: 'Nota', multiline: true }
    ],
    template: '\\porque{|}{%\n  \n}\n\n'
  },
  {
    kind: 'input',
    label: 'Archivo incluido',
    icon: 'FileSymlink',
    hint: 'Trae otro archivo del proyecto',
    doc: 'tex',
    fields: [{ name: 'ruta', label: 'Ruta', placeholder: 'sections/01-…' }],
    template: '\\input{|}\n'
  },
  {
    kind: 'env',
    label: 'Entorno',
    icon: 'Box',
    hint: 'Cualquier \\begin…\\end; contiene otros bloques',
    doc: 'tex',
    fields: [],
    template: '\\begin{itemize}\n  \\item |\n\\end{itemize}\n\n'
  },
  {
    kind: 'preamble',
    label: 'Preámbulo',
    icon: 'Settings2',
    hint: 'Clase, paquetes y ajustes: andamiaje, no contenido',
    doc: 'tex',
    fields: []
  },
  {
    kind: 'bibEntry',
    label: 'Referencia',
    icon: 'BookMarked',
    hint: 'Entrada bibliográfica',
    doc: 'bib',
    fields: [
      { name: 'tipo', label: 'Tipo' },
      { name: 'clave', label: 'Clave' }
    ],
    template: '@online{|,\n  title   = {},\n  author  = {},\n  year    = {},\n  url     = {},\n  urldate = {}\n}\n\n'
  },
  {
    kind: 'raw',
    label: 'LaTeX crudo',
    icon: 'Code',
    hint: 'Lo que el editor visual no sabe representar',
    doc: 'tex',
    fields: [],
    template: '|\n'
  }
]

const BY_KIND = new Map(CATALOG.map(spec => [spec.kind, spec]))

export function specOf(kind: BlockKind): BlockSpec {
  return BY_KIND.get(kind) ?? BY_KIND.get('raw')!
}

/** Tipos que se pueden crear desde el menú, para un archivo dado. */
export function insertable(doc: DocKind): BlockSpec[] {
  // `preamble` es agrupación, no algo que se inserte; `fuente` y `opcion` se
  // añaden desde dentro de su contenedor.
  const hidden = new Set<BlockKind>(['fuente', 'opcion', 'raw', 'preamble'])
  return CATALOG.filter(spec => spec.doc === doc && !hidden.has(spec.kind))
}

/**
 * Ficha de un campo. Los campos que no están en el catálogo — los argumentos de
 * un entorno cualquiera, los campos de una entrada `.bib` — se describen con su
 * propio nombre.
 */
export function fieldSpecOf(kind: BlockKind, name: string): FieldSpec {
  return specOf(kind).fields.find(f => f.name === name) ?? { name, label: name }
}

/** Qué tipo de hijo ofrece un contenedor al pulsar «añadir dentro». */
export function childKind(parent: BlockKind): BlockKind {
  if (parent === 'fuentes') return 'fuente'
  if (parent === 'mcq') return 'opcion'
  return 'raw'
}
