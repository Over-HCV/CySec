/**
 * Perfil propio: el nombre y el color con los que te ven los demás.
 *
 * Vive aparte de `useMe` porque son dos cosas distintas: `useMe` es la sesión de
 * auth, esto es la fila de `profiles`. El nombre lo pone el disparador
 * `handle_new_user` al crear la cuenta —la parte del correo antes de la arroba—
 * y hasta ahora no había forma de cambiarlo: la política «edición propia» de
 * `profiles` ya lo permitía, pero no existía interfaz que la usara.
 *
 * Estado compartido (`useState`), así que la consulta se hace una vez por carga
 * de página aunque lo pidan varios componentes.
 */
import type { Profile } from '~/shared/types/database'

export function useProfile() {
  const supabase = useSupabaseClient()
  const user = useMe()

  const profile = useState<Profile | null>('texel-profile', () => null)
  const started = useState<boolean>('texel-profile-started', () => false)
  const saving = ref(false)

  async function load(id: string) {
    // `maybeSingle` y no `single`: sin fila, `single` devuelve error y el perfil
    // se quedaba en null sin que nadie se enterara.
    const { data } = await supabase
      .from('profiles').select('*').eq('id', id).maybeSingle()
    profile.value = (data as Profile) ?? null
  }

  if (import.meta.client && !started.value) {
    started.value = true
    watch(user, (value) => {
      if (!value) profile.value = null
      else void load(value.id)
    }, { immediate: true })
  }

  /** Nombre visible, con respaldo: el correo antes que una fila en blanco. */
  const displayName = computed(() =>
    profile.value?.display_name?.trim() || user.value?.email || 'Anónimo')

  /**
   * Guarda el nombre. Devuelve el mensaje de error, o `null` si fue bien.
   * El `check` de la migración 004 rechaza el vacío en la base; aquí se corta
   * antes para no gastar la ida y vuelta.
   */
  async function rename(name: string): Promise<string | null> {
    const value = name.trim()
    if (!user.value) return 'No hay sesión'
    if (!value) return 'El nombre no puede quedar vacío'
    if (value === profile.value?.display_name) return null

    saving.value = true
    const { error } = await supabase
      .from('profiles').update({ display_name: value }).eq('id', user.value.id)
    saving.value = false
    if (error) return error.message

    // Optimista sobre lo que ya había: `update` sin `select` no devuelve la fila.
    profile.value = { ...(profile.value as Profile), display_name: value }
    return null
  }

  return { profile, displayName, rename, saving }
}
