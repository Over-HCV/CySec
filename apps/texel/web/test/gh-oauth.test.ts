import { describe, expect, it } from 'vitest'
import { signState, STATE_TTL_MS, verifyState } from '../server/utils/gh/state'

const SECRET = 'secreto-de-cliente-de-mentira'
const PROJECT = '3f2b1c4d-0000-4000-8000-abcdefabcdef'

describe('state del baile de OAuth', () => {
  it('la vuelta trae el proyecto del que se salió', () => {
    const { state, nonce } = signState(PROJECT, SECRET)
    expect(verifyState(state, SECRET, nonce)?.projectId).toBe(PROJECT)
  })

  it('sin la cookie no vale: la firma sola no basta', () => {
    // Es lo que impide que un enlace copiado a otro navegador enlace un
    // proyecto ajeno: la mitad que se queda aquí no viaja.
    const { state } = signState(PROJECT, SECRET)
    expect(verifyState(state, SECRET, undefined)).toBeNull()
  })

  it('un nonce que no es el guardado se rechaza', () => {
    const { state } = signState(PROJECT, SECRET)
    expect(verifyState(state, SECRET, 'otro-nonce')).toBeNull()
  })

  it('un cuerpo manipulado se rechaza aunque el proyecto exista', () => {
    const { state, nonce } = signState(PROJECT, SECRET)
    const [, signature] = state.split('.')
    const falso = Buffer.from(
      JSON.stringify({ projectId: 'otro', nonce, exp: Date.now() + STATE_TTL_MS }), 'utf8'
    ).toString('base64url')

    expect(verifyState(`${falso}.${signature}`, SECRET, nonce)).toBeNull()
  })

  it('otro secreto no lo abre', () => {
    const { state, nonce } = signState(PROJECT, SECRET)
    expect(verifyState(state, 'otro-secreto', nonce)).toBeNull()
  })

  it('caduca', () => {
    const ahora = Date.now()
    const { state, nonce } = signState(PROJECT, SECRET, ahora)
    expect(verifyState(state, SECRET, nonce, ahora + STATE_TTL_MS - 1)).not.toBeNull()
    expect(verifyState(state, SECRET, nonce, ahora + STATE_TTL_MS + 1)).toBeNull()
  })

  it('una cadena que no es un state no revienta', () => {
    for (const basura of ['', 'sin-punto', 'a.b', '...', 'eyJhIjoxfQ.firma']) {
      expect(verifyState(basura, SECRET, 'nonce')).toBeNull()
    }
  })

  it('dos idas seguidas no comparten nonce', () => {
    expect(signState(PROJECT, SECRET).nonce).not.toBe(signState(PROJECT, SECRET).nonce)
  })
})
