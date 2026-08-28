/**
 * Comparación a tres bandas entre el proyecto, el repositorio y la última
 * sincronización.
 *
 * Con dos versiones solo se sabe que difieren; con la base —qué blob tenía cada
 * archivo la última vez que las dos partes coincidieron— se sabe *quién* la
 * movió, que es lo único que permite sincronizar sin preguntar a cada paso ni
 * pisar el trabajo de nadie.
 *
 * Aquí no hay red ni base de datos: entran tres mapas de `ruta → sha` y sale
 * una lista de decisiones. El sha es el del blob de git, así que se puede
 * calcular en local (`blobSha`) y comparar con el que devuelve GitHub sin subir
 * nada.
 */
import { createHash } from 'node:crypto'

export type ChangeAction =
  /** El repo tiene algo que el proyecto no: se trae. */
  | 'pull'
  /** Borrado en el repo: se borra del proyecto. */
  | 'pull-delete'
  /** El proyecto tiene algo que el repo no: se sube. */
  | 'push'
  /** Borrado en el proyecto: se borra del repo. */
  | 'push-delete'
  /** Cambió en los dos sitios: no se toca. */
  | 'conflict'

export interface Change {
  path: string
  action: ChangeAction
  /** Sha del blob en el proyecto, si sigue existiendo. */
  local: string | null
  /** Sha del blob en el repositorio, si sigue existiendo. */
  remote: string | null
  /** Sha de la última sincronización, si la hubo. */
  base: string | null
}

export interface SyncStatus {
  /** Lo que hay que traer del repositorio. */
  behind: Change[]
  /** Lo que hay que subir al repositorio. */
  ahead: Change[]
  /** Lo que cambió en los dos sitios. */
  conflicts: Change[]
}

/**
 * El sha que git le daría a este contenido: `sha1("blob <bytes>\0" + datos)`.
 * Es lo que permite comparar sin subir nada y sin pedir cada archivo al repo.
 */
export function blobSha(content: Uint8Array | string): string {
  const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : Buffer.from(content)
  return createHash('sha1')
    .update(`blob ${data.length}\0`)
    .update(data)
    .digest('hex')
}

/**
 * Clasifica cada ruta de la unión de los tres mapas.
 *
 * Un archivo que no está en la base y aparece en los dos lados con contenidos
 * distintos es conflicto, no «traer»: son dos archivos escritos por separado y
 * elegir uno en silencio perdería el otro.
 */
export function classify(
  local: Map<string, string>,
  remote: Map<string, string>,
  base: Map<string, string>
): SyncStatus {
  const status: SyncStatus = { behind: [], ahead: [], conflicts: [] }

  for (const path of [...new Set([...local.keys(), ...remote.keys(), ...base.keys()])].sort()) {
    const l = local.get(path) ?? null
    const r = remote.get(path) ?? null
    const b = base.get(path) ?? null

    // Iguales: nada que hacer, aunque la base esté vieja o no exista.
    if (l && r && l === r) continue
    // Borrado en los dos sitios: solo queda limpiar la base, y de eso se encarga
    // quien escribe el resultado.
    if (!l && !r) continue

    const change: Change = { path, action: 'conflict', local: l, remote: r, base: b }

    if (!b) {
      // Sin base: si solo existe en un lado, es un archivo nuevo de ese lado.
      if (l && !r) status.ahead.push({ ...change, action: 'push' })
      else if (!l && r) status.behind.push({ ...change, action: 'pull' })
      else status.conflicts.push(change)
      continue
    }

    const localMoved = l !== b
    const remoteMoved = r !== b

    if (localMoved && remoteMoved) status.conflicts.push(change)
    else if (remoteMoved) status.behind.push({ ...change, action: r ? 'pull' : 'pull-delete' })
    else if (localMoved) status.ahead.push({ ...change, action: l ? 'push' : 'push-delete' })
  }

  return status
}

/** ¿Hay algo que hacer? */
export function isClean(status: SyncStatus): boolean {
  return !status.behind.length && !status.ahead.length && !status.conflicts.length
}

/** Resumen corto para la interfaz: «2 por subir · 1 por bajar». */
export function summarize(status: SyncStatus): string {
  const parts: string[] = []
  if (status.ahead.length) parts.push(`${status.ahead.length} por subir`)
  if (status.behind.length) parts.push(`${status.behind.length} por bajar`)
  if (status.conflicts.length) parts.push(`${status.conflicts.length} en conflicto`)
  return parts.join(' · ') || 'al día'
}
