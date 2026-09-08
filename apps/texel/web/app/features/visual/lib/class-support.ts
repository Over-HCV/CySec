/**
 * Qué sabe hacer la clase LaTeX **de este proyecto**.
 *
 * Un proyecto de Texel se lleva su propia copia de `tex/common/*.tex` el día que
 * nace (`template.generated.ts`), y nadie se la actualiza después. Así que la
 * plantilla puede ir por delante del proyecto que se está editando, y el editor
 * no puede dar por hecho que la clase entiende lo que le escribe.
 *
 * Importa para el recorte: `\captura[…]{…}{…}` contra la versión de dos
 * argumentos no avisa, se rompe —TeX toma el `[` suelto como el nombre del
 * archivo— y deja el taller sin compilar. Antes de ofrecer el botón se mira.
 */

/** Los dos archivos de la clase que el recorte necesita, con su ruta. */
export const CROP_CLASS_FILES = ['tex/common/preamble.tex', 'tex/common/boxes.tex']

/**
 * ¿El preámbulo pone `\includegraphics` en manos de adjustbox?
 *
 * Es lo que da el `trim` en unidades relativas. Se comprueban las dos líneas: el
 * paquete y el `\let`, porque cargar adjustbox a secas no cambia nada.
 */
export function tieneAdjustbox(preamble: string): boolean {
  return /\\(?:RequirePackage|usepackage)\s*(?:\[[^\]]*\])?\s*\{\s*adjustbox\s*\}/.test(preamble)
    && /\\let\s*\\includegraphics\s*\\adjincludegraphics/.test(preamble)
}

/** ¿`\captura` acepta el argumento opcional con las opciones de la imagen? */
export function capturaConOpciones(boxes: string): boolean {
  return /\\(?:re)?newcommand\s*\{?\s*\\captura\s*\}?\s*\[\s*3\s*\]\s*\[/.test(boxes)
}

/**
 * ¿Se puede recortar en este proyecto? Hacen falta las dos cosas: el paquete
 * para el `figure` a pelo y la macro para la `\captura`, y ofrecer solo media
 * función sería peor que explicarlo.
 *
 * Los dos argumentos llegan `null` cuando el archivo no está —un proyecto
 * importado a mano, el banco de pruebas—; ahí no se recorta, pero tampoco se
 * ofrece actualizar nada, porque no hay nada que actualizar.
 */
export function soportaRecorte(preamble: string | null, boxes: string | null): boolean {
  return preamble !== null && boxes !== null
    && tieneAdjustbox(preamble) && capturaConOpciones(boxes)
}
