/**
 * Lado Texel de la sincronización: qué archivos tiene el proyecto, con qué
 * contenido, y cómo se escribe en él lo que llega del repositorio.
 *
 * Los textos viven en `files.content` —volcado del documento Yjs— y los
 * binarios en el bucket `project-assets`, con el id del proyecto de primer
 * segmento, que es lo que miran las políticas del bucket.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { isTextPath } from '../../../app/features/projects/lib/import-folder'
import { syncSkipReason } from './mapping'
import { blobSha } from './diff'
import { applyText, flushDoc } from './yjs'

export interface LocalFile {
  path: string
  fileId: string
  kind: 'text' | 'binary'
  sha: string
  size: number
  /** Contenido, ya en bytes: es lo que se sube a GitHub. */
  content: Buffer
}

export interface LocalSnapshot {
  files: Map<string, LocalFile>
  skipped: { path: string, reason: string }[]
}

/**
 * Foto del proyecto ahora mismo.
 *
 * Antes de leer se compacta el documento de cada archivo de texto: lo que
 * alguien esté tecleando en este instante todavía está en el log de Yjs y no en
 * `files.content`, y subir sin eso mandaría a GitHub la versión de hace un rato
 * —y la marcaría como sincronizada.
 */
export async function readProject(
  admin: SupabaseClient,
  projectId: string
): Promise<LocalSnapshot> {
  const { data: rows, error } = await admin
    .from('files')
    .select('id, path, kind, content, storage_path, size_bytes')
    .eq('project_id', projectId)
  if (error) throw error

  const files = new Map<string, LocalFile>()
  const skipped: { path: string, reason: string }[] = []

  for (const row of rows ?? []) {
    const path = row.path as string
    const reason = syncSkipReason(path, row.size_bytes as number)
    if (reason) { skipped.push({ path, reason }); continue }

    if (row.kind === 'text') {
      const text = await flushDoc(admin, row.id as string)
      const content = Buffer.from(text, 'utf8')
      files.set(path, {
        path, fileId: row.id as string, kind: 'text', content,
        sha: blobSha(content), size: content.length
      })
      continue
    }

    if (!row.storage_path) continue
    const { data: blob, error: downloadError } = await admin.storage
      .from('project-assets').download(row.storage_path as string)
    if (downloadError) throw downloadError
    const content = Buffer.from(await blob.arrayBuffer())
    files.set(path, {
      path, fileId: row.id as string, kind: 'binary', content,
      sha: blobSha(content), size: content.length
    })
  }

  return { files, skipped }
}

/**
 * Escribe en el proyecto un archivo que viene del repositorio.
 *
 * Los textos pasan por el documento compartido (`applyText`), no por un
 * `update` a secas: si alguien lo tiene abierto, el cambio le llega como una
 * edición y no se lo pisa su siguiente volcado.
 */
export async function writeIncoming(
  admin: SupabaseClient,
  projectId: string,
  path: string,
  content: Buffer,
  existing?: LocalFile
): Promise<void> {
  if (isTextPath(path)) {
    const text = content.toString('utf8')
    if (existing?.kind === 'text') {
      await applyText(admin, existing.fileId, text)
      return
    }
    const { error } = await admin.from('files').upsert({
      project_id: projectId,
      path,
      kind: 'text',
      content: text,
      size_bytes: Buffer.byteLength(text)
    }, { onConflict: 'project_id,path' })
    if (error) throw error
    return
  }

  const storagePath = `${projectId}/${path}`
  const { error: uploadError } = await admin.storage
    .from('project-assets')
    .upload(storagePath, content, { upsert: true })
  if (uploadError) throw uploadError

  const { error } = await admin.from('files').upsert({
    project_id: projectId,
    path,
    kind: 'binary',
    storage_path: storagePath,
    size_bytes: content.length
  }, { onConflict: 'project_id,path' })
  if (error) throw error
}

/** Borra del proyecto un archivo que ya no está en el repositorio. */
export async function deleteLocal(
  admin: SupabaseClient,
  projectId: string,
  file: LocalFile
): Promise<void> {
  if (file.kind === 'binary') {
    await admin.storage.from('project-assets').remove([`${projectId}/${file.path}`])
  }
  const { error } = await admin.from('files').delete().eq('id', file.fileId)
  if (error) throw error
}

/**
 * Deja la base de la comparación igual a lo que acaba de quedar sincronizado.
 *
 * Se reescribe entera en vez de parchearla: es una tabla pequeña, y una base
 * parcheada mal es peor que ninguna —haría pasar por «cambió allí» algo que
 * nadie tocó.
 */
export async function rewriteBase(
  admin: SupabaseClient,
  projectId: string,
  entries: { path: string, sha: string, size: number }[]
): Promise<void> {
  const { error: clearError } = await admin
    .from('project_repo_files').delete().eq('project_id', projectId)
  if (clearError) throw clearError
  if (!entries.length) return

  const { error } = await admin.from('project_repo_files').insert(entries.map(entry => ({
    project_id: projectId,
    path: entry.path,
    blob_sha: entry.sha,
    size_bytes: entry.size
  })))
  if (error) throw error
}

/** La base tal y como quedó en la última sincronización. */
export async function readBase(
  admin: SupabaseClient,
  projectId: string
): Promise<Map<string, string>> {
  const { data, error } = await admin
    .from('project_repo_files').select('path, blob_sha').eq('project_id', projectId)
  if (error) throw error
  return new Map((data ?? []).map(row => [row.path as string, row.blob_sha as string]))
}
