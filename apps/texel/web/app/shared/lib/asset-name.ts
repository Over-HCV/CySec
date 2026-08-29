/**
 * Cómo se llama y dónde vive una imagen del proyecto.
 *
 * Es lógica pura a propósito, fuera del composable: así se puede probar sin
 * arrancar Nuxt ni Supabase, como `anchor-menu.ts`. Lo que necesita sesión —
 * subir y firmar— se queda en `shared/composables/useProjectAssets.ts`.
 */

/** Carpeta del proyecto donde van las imágenes que se suben desde el editor. */
export const PIPS_DIR = 'pips'

/**
 * Lo que `xelatex` sabe incluir. Un `webp` o un `gif` se subirían sin protestar
 * y luego romperían la compilación para todo el mundo, así que se rechazan con
 * un motivo, que es más barato que un PDF que no sale.
 */
const TIPOS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/pdf': '.pdf'
}

/** Para el `accept` de un `<input type="file">`. */
export const TIPOS_ACEPTADOS = Object.keys(TIPOS).join(',')

/** ¿Este `File.type` es uno de los que el compilador sabe poner en el PDF? */
export function esTipoAceptado(type: string): boolean {
  return type in TIPOS
}

/** La extensión que le toca a un tipo, o `null` si no se acepta. */
export function extensionDe(type: string): string | null {
  return TIPOS[type] ?? null
}

/**
 * Alfabeto de matrícula: sin `I`, `O`, `0` ni `1`.
 *
 * El nombre se dicta y se copia a mano («la imagen QRT-482»), y esas cuatro son
 * justo las que se confunden al leerlas.
 */
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const CIFRAS = '23456789'

/** Nombre tipo matrícula: tres letras, guion, tres cifras. ~11 millones. */
export function plate(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  const letras = [...bytes.slice(0, 3)].map(b => LETRAS[b % LETRAS.length]).join('')
  const cifras = [...bytes.slice(3)].map(b => CIFRAS[b % CIFRAS.length]).join('')
  return `${letras}-${cifras}`
}

/**
 * El nombre que escriba el usuario, reducido a algo que LaTeX no malinterprete.
 *
 * Sin barras —la carpeta la pone el editor, no quien escribe—, sin espacios
 * (`\includegraphics{mi foto.png}` no compila) y sin puntos, que son lo que
 * separa el nombre de la extensión.
 */
export function slug(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
