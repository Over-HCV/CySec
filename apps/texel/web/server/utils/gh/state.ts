/**
 * El `state` del baile de OAuth: qué proyecto abrió la sesión y prueba de que
 * la vuelta corresponde a esta ida.
 *
 * GitHub devuelve `state` tal cual, así que sin firma cualquiera podría
 * fabricar una vuelta con el proyecto que quisiera. Va firmado con el secreto
 * de cliente —que ya vive solo en el servidor— y caduca a los diez minutos, que
 * es de sobra para autorizar y bastante poco para que un enlace olvidado en el
 * historial no sirva de nada.
 *
 * Aquí no se toca ni la red ni la base: entra un proyecto y sale una cadena, y
 * al revés. Por eso se puede probar entero sin levantar nada.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** Diez minutos: el tiempo de ir a GitHub, autorizar y volver. */
export const STATE_TTL_MS = 10 * 60 * 1000

export interface StatePayload {
  projectId: string
  nonce: string
  /** Momento de caducidad, en milisegundos desde época. */
  exp: number
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url')
}

/** Cadena que viaja a GitHub: `<cuerpo en base64url>.<firma>`. */
export function signState(
  projectId: string,
  secret: string,
  now = Date.now(),
  nonce = randomBytes(16).toString('base64url')
): { state: string, nonce: string } {
  const payload: StatePayload = { projectId, nonce, exp: now + STATE_TTL_MS }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return { state: `${body}.${sign(body, secret)}`, nonce }
}

/**
 * Deshace lo anterior, o `null` si la firma no cuadra, si caducó o si el nonce
 * no es el que se guardó en la cookie. Los tres casos se tratan igual a
 * propósito: quien manda un `state` inválido no merece saber por qué.
 */
export function verifyState(
  state: string | undefined,
  secret: string,
  expectedNonce: string | undefined,
  now = Date.now()
): StatePayload | null {
  if (!state || !expectedNonce) return null

  const [body, signature] = state.split('.')
  if (!body || !signature) return null

  // Comparación en tiempo constante: comparar firmas con `===` filtra, por lo
  // que tarda, cuántos bytes iniciales acertó quien la está adivinando.
  const expected = Buffer.from(sign(body, secret))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  let payload: StatePayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StatePayload
  } catch {
    return null
  }

  if (typeof payload.exp !== 'number' || payload.exp < now) return null
  if (payload.nonce !== expectedNonce) return null
  return payload
}
