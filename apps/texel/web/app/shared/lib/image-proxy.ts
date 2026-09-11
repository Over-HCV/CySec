/**
 * Derivada ligera de una imagen: lo que se compila mientras se escribe.
 *
 * El motivo es xdvipdfmx. Cuando un PNG trae perfil ICC o canal alfa —las dos
 * cosas que pone macOS en cada captura de pantalla— no puede copiar el stream
 * dentro del PDF: lo descomprime con libpng y lo vuelve a comprimir, **en cada
 * pasada**. Con capturas de 3024×1964 eso son ~25 s por compilación y un PDF de
 * 12,8 MB que hay que subir y volver a bajar; a 1400 px y sin alfa el mismo
 * documento cuesta segundos y el PDF baja a poco más de 1 MB.
 *
 * El original no se toca: sigue en `project-assets` y es lo que usa la
 * compilación `full`, que es la que se descarga. Esto es solo para mirar.
 *
 * Es lógica de navegador (canvas), así que vive aparte del composable y se
 * prueba sola. El mismo recorte lo hace `scripts/optimize-assets.ts` con sharp
 * para las imágenes que ya estaban subidas.
 */

/** Ancho máximo de la derivada. Un ancho de texto son ~450 pt: 1400 px sobran. */
export const PROXY_MAX_PX = 1400

/** Por debajo de esto no vale la pena: el original ya es ligero. */
export const PROXY_MIN_BYTES = 250 * 1024

/**
 * Reduce la imagen y le quita la transparencia (fondo blanco), que es lo que
 * fuerza a xdvipdfmx a recodificar. Devuelve `null` si no hay nada que ganar —
 * la imagen ya es pequeña, o es un PDF, o el navegador no sabe decodificarla—
 * y entonces se compila con el original, como antes.
 */
export async function makeProxy(file: File): Promise<Blob | null> {
  if (!file.type.startsWith('image/')) return null
  if (file.size < PROXY_MIN_BYTES) return null
  if (typeof createImageBitmap !== 'function') return null

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  try {
    const scale = Math.min(1, PROXY_MAX_PX / bitmap.width)
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // El blanco primero: si la captura tiene esquinas redondeadas con alfa, sin
    // esto quedan negras al aplanarlas contra un canvas vacío.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    // Una derivada que pesa más que el original no es una derivada.
    if (!blob || blob.size >= file.size) return null
    return blob
  } finally {
    bitmap.close()
  }
}

/** Dónde vive la derivada de un objeto de `project-assets`. */
export function proxyStoragePath(storagePath: string): string {
  const slash = storagePath.indexOf('/')
  // El primer segmento tiene que seguir siendo el project_id: las políticas del
  // bucket (`002_storage.sql`) miran justo eso para dejar leer y escribir.
  if (slash < 0) return `.proxy/${storagePath}`
  return `${storagePath.slice(0, slash)}/.proxy/${storagePath.slice(slash + 1)}`
}
