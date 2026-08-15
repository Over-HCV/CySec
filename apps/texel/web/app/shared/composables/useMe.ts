import type { User } from '@supabase/supabase-js'

/**
 * Usuario actual.
 *
 * No se usa `useSupabaseUser()` del módulo: lo rellena con
 * `client.auth.getClaims()`, que necesita JWKS y no resuelve contra un Supabase
 * local con secreto HS256 — el ref se quedaba en `null` aunque la sesión
 * existiera, y con él el rol del proyecto, dejando la interfaz en «solo
 * lectura» incluso para el dueño.
 *
 * Aquí se pregunta directamente a `auth.getUser()` y se reacciona a los cambios
 * de sesión. El estado es compartido (useState), así que la petición se hace una
 * vez por carga de página, no una por componente.
 */
export function useMe() {
  const supabase = useSupabaseClient()
  const session = useSupabaseSession()
  const me = useState<User | null>('texel-me', () => null)
  const started = useState<boolean>('texel-me-started', () => false)

  if (import.meta.client && !started.value) {
    started.value = true

    const load = async () => {
      const { data } = await supabase.auth.getUser()
      me.value = data.user ?? null
    }

    void load()
    watch(session, (value) => {
      if (!value) me.value = null
      else void load()
    })
  }

  return me
}
