/**
 * Quién puede tocar qué.
 *
 * Las rutas escriben con la clave de servicio, que se salta el RLS, así que la
 * comprobación de pertenencia tiene que hacerse aquí a mano —igual que en el
 * compilador (`compiler/src/auth.ts`)—, y antes de tocar nada.
 */
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export type Role = 'viewer' | 'editor' | 'owner'
const RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 }

export interface Caller {
  userId: string
  admin: SupabaseClient
}

/**
 * Sesión iniciada, con un cliente de servicio para el resto de la petición.
 *
 * `serverSupabaseUser` devuelve los **claims** del JWT, no una fila de
 * `auth.users`: el identificador viene en `sub`, y `id` no existe. Leerlo mal no
 * rompía nada visible —salía `undefined`— hasta que llegaba a la base como
 * `user_id=eq.undefined` y Postgres respondía «invalid input syntax for type
 * uuid». De ahí que se compruebe aquí y no en cada consulta.
 */
export async function requireUser(event: H3Event): Promise<Caller> {
  const claims = await serverSupabaseUser(event)
  const userId = claims?.sub
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'sesión no iniciada' })
  return { userId, admin: adminClient(event) }
}

/**
 * El cliente que se salta el RLS. Sin `SUPABASE_SERVICE_KEY` el módulo lanza un
 * «Your project's URL and Key are required», que sale como un 500 pelado y no
 * dice qué falta: en un despliegue nuevo es justo la variable que se olvida,
 * porque el resto de la aplicación funciona sin ella.
 */
function adminClient(event: H3Event): SupabaseClient {
  try {
    return serverSupabaseServiceRole(event)
  } catch {
    throw createError({
      statusCode: 501,
      statusMessage: 'falta SUPABASE_SERVICE_KEY en el servidor: sin ella no se puede sincronizar'
    })
  }
}

/**
 * Pertenencia al proyecto con el rol mínimo pedido. Enlazar y sincronizar son
 * cosa del dueño: cambian a qué repositorio escribe el proyecto entero.
 */
export async function requireProject(
  event: H3Event,
  projectId: string,
  minRole: Role = 'owner'
): Promise<Caller> {
  const caller = await requireUser(event)
  if (!projectId) throw createError({ statusCode: 400, statusMessage: 'falta projectId' })

  const { data, error } = await caller.admin
    .from('project_members').select('role')
    .eq('project_id', projectId).eq('user_id', caller.userId).maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 403, statusMessage: 'no eres miembro del proyecto' })
  if (RANK[data.role as Role] < RANK[minRole]) {
    throw createError({ statusCode: 403, statusMessage: `hace falta rol ${minRole}` })
  }

  return caller
}

/** La instalación tiene que ser de quien la usa, o cualquiera podría pedir prestado su acceso. */
export async function requireInstallation(caller: Caller, installationId: number): Promise<void> {
  const { data, error } = await caller.admin
    .from('github_installation_users').select('installation_id')
    .eq('installation_id', installationId).eq('user_id', caller.userId).maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 403, statusMessage: 'esa instalación de GitHub no es tuya' })
}
