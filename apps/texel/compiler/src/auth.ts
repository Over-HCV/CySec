import type { FastifyRequest } from 'fastify'
import { admin, anon } from './supabase.ts'

export type Role = 'viewer' | 'editor' | 'owner'
const RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 }

export class HttpError extends Error {
  // Campo declarado y asignado a mano: el "strip-only" de Node (que es como se
  // ejecuta este servicio, sin paso de compilación) no admite parameter properties.
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Valida el JWT contra Supabase. Se delega en `auth.getUser` en vez de
 * verificar la firma a mano: así funciona igual con secreto simétrico o con
 * claves asimétricas, y respeta revocaciones de sesión.
 */
export async function requireUser(req: FastifyRequest): Promise<string> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'falta el token')

  const { data, error } = await anon.auth.getUser(header.slice(7))
  if (error || !data.user) throw new HttpError(401, 'token inválido')
  return data.user.id
}

/** Comprueba pertenencia al proyecto con el rol mínimo pedido. */
export async function requireMember(
  userId: string,
  projectId: string,
  minRole: Role = 'viewer'
): Promise<Role> {
  const { data, error } = await admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new HttpError(500, error.message)
  if (!data) throw new HttpError(403, 'no eres miembro del proyecto')

  const role = data.role as Role
  if (RANK[role] < RANK[minRole]) throw new HttpError(403, `hace falta rol ${minRole}`)
  return role
}
