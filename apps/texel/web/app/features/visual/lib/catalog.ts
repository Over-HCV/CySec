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
    kind: 'lista',
    label: 'Lista',
    icon: 'List',
    hint: 'Puntos o números; cada elemento es una línea',
    doc: 'tex',
    fields: [],
    template: '\\begin{itemize}\n  \\item |\n\\end{itemize}\n\n'
  },
  {
    kind: 'item',
    label: 'Elemento',
    icon: 'Dot',
    hint: 'Un punto de la lista',
    doc: 'tex',
    fields: [
      { name: 'etiqueta', label: 'Etiqueta' },
      { name: 'texto', label: 'Texto' }
    ],
    template: '  \\item |\n'
  },
  {
    kind: 'env',
    label: 'Entorno',
    icon: 'Box',
    hint: 'Cualquier \\begin…\\end; contiene otros bloques',
    doc: 'tex',
    fields: [],
    // Un `center` y no una lista: para eso está el bloque «Lista», y una lista
    // escrita desde aquí no se leería como tal hasta escribir el primer `\item`.
    template: '\\begin{center}\n  |\n\\end{center}\n\n'
  },
  {
    kind: 'figura',
    label: 'Imagen',
    icon: 'Image',
    hint: 'Una captura o una foto, con su pie',
    doc: 'tex',
    fields: [
      { name: 'pie', label: 'Pie' },
      { name: 'ruta', label: 'Archivo' },
      { name: 'ancho', label: 'Ancho' }
    ]
    // Sin `template`: primero hay que subir el archivo, y hasta entonces no se
    // sabe qué ruta escribir. La plantilla la compone `figureTemplate`.
  },
  {
    kind: 'code',
    label: 'Código',
    icon: 'Terminal',
    hint: 'Un comando, una consulta o un payload, tal cual se escribe',
    doc: 'tex',
    fields: [
      { name: 'lenguaje', label: 'Lenguaje' },
      { name: 'codigo', label: 'Código', multiline: true }
    ],
    template: '\\begin{lstlisting}[language=bash]\n|\n\\end{lstlisting}\n\n'
  },
  {
    kind: 'table',
    label: 'Tabla',
    icon: 'Table',
    hint: 'Una rejilla de celdas, con sus filas y sus reglas',
    doc: 'tex',
    fields: [{ name: 'columnas', label: 'Columnas' }],
    // `tabularx` y no `tabular`: es el que reparte el ancho sobrante entre las
    // columnas `X`, que es lo que hace que una descripción larga no se salga
    // del margen. Es también el que usan los talleres.
    template: '\\begin{tabularx}{\\linewidth}{@{}lX@{}}\n'
      + '  \\toprule\n'
      + '  | & \\\\\n'
      + '  \\midrule\n'
      + '   & \\\\\n'
      + '  \\bottomrule\n'
      + '\\end{tabularx}\n\n'
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
    kind: 'paragraph',
    label: 'Texto',
    icon: 'Pilcrow',
    hint: 'Un párrafo normal, con negrita, cursiva y código',
    doc: 'tex',
    fields: [{ name: 'texto', label: 'Texto', multiline: true }],
    template: '|\n\n'
  },
  {
    kind: 'atom',
    label: 'Macro',
    icon: 'Zap',
    hint: 'Una instrucción suelta de LaTeX',
    doc: 'tex',
    fields: []
  },
  {
    kind: 'meta',
    label: 'Datos del taller',
    icon: 'IdCard',
    hint: 'Número, título, sesión, fecha y autor',
    doc: 'tex',
    fields: []
  },
  {
    kind: 'raw',
    label: 'LaTeX',
    icon: 'Code',
    hint: 'Lo que el editor visual no sabe representar',
    doc: 'tex',
    fields: [],
    template: '|\n'
  }
]

/**
 * Macros sueltas con nombre propio.
 *
 * Son las que no llevan contenido que editar —o llevan un solo dato— y que hoy
 * salían como código en pantalla. Aquí dejan de ser `\makewsheader` y pasan a
 * ser «Portada del taller».
 *
 * `arg`: `none` sin argumento, `group` con `{…}`, `option` con `[…]` opcional.
 */
export interface AtomSpec {
  label: string
  icon: string
  arg: 'none' | 'group' | 'option'
  /** Etiqueta del campo cuando el argumento se puede editar. */
  field?: string
}

export const ATOMS: Record<string, AtomSpec> = {
  makewsheader: { label: 'Portada del taller', icon: 'LayoutPanelTop', arg: 'none' },
  printbibliography: { label: 'Bibliografía', icon: 'BookMarked', arg: 'option' },
  tableofcontents: { label: 'Índice', icon: 'List', arg: 'none' },
  clearpage: { label: 'Salto de página', icon: 'SeparatorHorizontal', arg: 'none' },
  newpage: { label: 'Salto de página', icon: 'SeparatorHorizontal', arg: 'none' },
  nocite: { label: 'Citas ocultas', icon: 'Quote', arg: 'group', field: 'Claves' },
  addbibresource: { label: 'Archivo de bibliografía', icon: 'BookMarked', arg: 'group', field: 'Ruta' },
  // Datos del taller (`meta.tex`): un dato por macro, todos rellenables.
  wsnumber: { label: 'Taller n.º', icon: 'Hash', arg: 'group', field: 'Número' },
  wstitle: { label: 'Título', icon: 'Type', arg: 'group', field: 'Título' },
  wssession: { label: 'Sesión', icon: 'Calendar', arg: 'group', field: 'Sesión' },
  wsdate: { label: 'Fecha', icon: 'Calendar', arg: 'group', field: 'Fecha' },
  wsauthor: { label: 'Autor', icon: 'User', arg: 'group', field: 'Autor' }
}

/** Las macros de `meta.tex`, que se agrupan bajo «Datos del taller». */
export const WS_META = new Set(['wsnumber', 'wstitle', 'wssession', 'wsdate', 'wsauthor'])

/**
 * Macros y entornos que el editor sabe representar. Sirve para avisar cuando
 * uno de ellos no se pudo leer —una llave sin cerrar— en vez de dejar el LaTeX
 * suelto sin explicación.
 */
export const KNOWN_COMMANDS = [
  'porque', 'pregunta', 'fuente', 'opcion', 'section', 'subsection', 'input',
  'captura', 'lstlisting',
  // `\item` no entra: no lleva llaves, así que no hay ninguna que se pueda
  // quedar sin cerrar, y avisar de un `\item` suelto sería ruido.
  ...Object.keys(ATOMS)
]
// `includegraphics` **no** entra en la lista de arriba, aunque el editor sepa
// leerlo: la lista sirve para avisar de «esto se intentó escribir y no se pudo»,
// y se comprueba también dentro de los entornos opacos, que salen enteros como
// `raw`. Un `\begin{center}\includegraphics{…}\end{center}` —el modo de poner
// una imagen a mano de toda la vida— avisaría de una llave sin cerrar que no
// existe. El aviso vale menos que ese falso positivo.

/**
 * Lenguajes que ofrece el bloque de código.
 *
 * Son los que de verdad aparecen en los talleres (`grep -ro 'language=[A-Za-z]*'
 * latex/`) y los que la clase sabe colorear: `listings` trae `bash`, `SQL`,
 * `HTML`, `Java` y `Python`; `JavaScript` lo define
 * `latex/tex/common/preamble.tex`. La cadena vacía es «sin lenguaje», que es un
 * listing perfectamente válido.
 */
export const LST_LANGUAGES = ['', 'bash', 'SQL', 'HTML', 'JavaScript', 'Java', 'Python']

/** Ancho por defecto de una imagen recién puesta, en fracciones de `\linewidth`. */
export const FIGURE_WIDTH = '0.8'

/**
 * El LaTeX de una imagen ya subida.
 *
 * Se compone aquí y no en el catálogo como `template` porque hace falta la ruta
 * real: el bloque nace con su archivo dentro, nunca vacío. El `|` es la marca de
 * cursor de `insertBlock`, y va en el pie, que es lo único que queda por decidir.
 *
 * `[htbp]` y no `[H]`: `latex/tex/common/preamble.tex` carga `graphicx` pero no
 * `float`, así que `[H]` no existiría.
 */
export function figureTemplate(path: string, label: string): string {
  return `\\begin{figure}[htbp]\n`
    + `  \\centering\n`
    + `  \\includegraphics[width=${FIGURE_WIDTH}\\linewidth]{${path}}\n`
    + `  \\caption{|}\n`
    + `  \\label{fig:${label}}\n`
    + `\\end{figure}\n\n`
}

/**
 * El LaTeX de una captura del laboratorio.
 *
 * `\captura{archivo.png}{pie}` (`latex/tex/common/boxes.tex`) es lo que usa el
 * curso, y hace dos cosas que un `figure` a mano no hace: busca el archivo
 * dentro de `pics/` —por eso aquí va el nombre y no la ruta— y, si todavía no
 * está, dibuja una caja «captura pendiente» en vez de romper la compilación.
 * Por eso es lo que se escribe al insertar una imagen nueva.
 */
export function capturaTemplate(file: string): string {
  return `\\captura{${file}}{|}\n\n`
}

const BY_KIND = new Map(CATALOG.map(spec => [spec.kind, spec]))

export function specOf(kind: BlockKind): BlockSpec {
  return BY_KIND.get(kind) ?? BY_KIND.get('raw')!
}

/** Tipos que se pueden crear desde el menú, para un archivo dado. */
export function insertable(doc: DocKind): BlockSpec[] {
  // `preamble`, `meta` y `atom` son agrupación o andamiaje, no algo que se
  // inserte a mano; `fuente` y `opcion` se añaden desde dentro de su contenedor.
  const hidden = new Set<BlockKind>([
    'fuente', 'opcion', 'item', 'raw', 'preamble', 'meta', 'atom'
  ])
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

/**
 * A qué otro tipo se puede convertir cada bloque.
 *
 * La matriz es explícita y corta a propósito: convertir es reescribir LaTeX, y
 * ofrecer combinaciones que no significan nada —una imagen «convertida» en una
 * pregunta— solo sirve para perder texto. Se separan dos familias que no se
 * mezclan:
 *
 * - **Hojas**: se conserva el texto que lleva dentro y se cambia el envoltorio.
 * - **Contenedores**: no se toca el cuerpo, solo el `\begin` y el `\end`, así
 *   que los hijos siguen exactamente donde estaban.
 */
export const CONVERSIONS: Partial<Record<BlockKind, BlockKind[]>> = {
  paragraph: ['section', 'pregunta', 'porque', 'code', 'raw'],
  raw: ['paragraph', 'code', 'section', 'pregunta'],
  code: ['paragraph', 'raw'],
  section: ['paragraph', 'pregunta', 'raw'],
  pregunta: ['paragraph', 'section', 'porque', 'raw'],
  porque: ['paragraph', 'pregunta', 'raw'],
  input: ['paragraph', 'raw'],
  caso: ['respuesta', 'mcq', 'fuentes'],
  respuesta: ['caso', 'mcq', 'fuentes'],
  mcq: ['caso', 'respuesta', 'fuentes'],
  fuentes: ['caso', 'respuesta', 'mcq'],
  env: ['caso', 'respuesta', 'mcq', 'fuentes']
}

/** Los tipos que son un `\begin…\end` con nombre fijo y hijos dentro. */
export const CONTAINER_KINDS = new Set<BlockKind>(['caso', 'respuesta', 'mcq', 'fuentes', 'env'])

/** Cuántos argumentos `{…}` lleva el `\begin` de cada contenedor con ficha. */
export const CONTAINER_ARGS: Partial<Record<BlockKind, number>> = {
  caso: 1,
  mcq: 1,
  respuesta: 0,
  fuentes: 0
}

/** Los tipos a los que se puede convertir este, con su ficha para el menú. */
export function conversionsFor(kind: BlockKind): BlockSpec[] {
  return (CONVERSIONS[kind] ?? []).map(specOf)
}

/** Qué tipo de hijo ofrece un contenedor al pulsar «añadir dentro». */
export function childKind(parent: BlockKind): BlockKind {
  if (parent === 'fuentes') return 'fuente'
  if (parent === 'mcq') return 'opcion'
  if (parent === 'lista') return 'item'
  // En cualquier otro contenedor, lo que se quiere escribir es texto.
  return 'paragraph'
}
