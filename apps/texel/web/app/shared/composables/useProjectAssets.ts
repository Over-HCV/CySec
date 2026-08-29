/**
 * Imágenes de un proyecto: subirlas y volver a verlas.
 *
 * Sube igual que `useProjectImport.writeBinaries` —objeto en `project-assets`
 * más una fila en `files` con `kind: 'binary'`—, porque esa es la única forma
 * que el compilador sabe leer: `syncSources` escribe cada binario en
 * `safeJoin(workdir, file.path)` y `latexmk` corre desde la raíz del workdir,
 * así que `files.path` **es** la ruta que va dentro del `\includegraphics`.
 * Por eso no hace falta `\graphicspath`: `pics/QRT-482.png` resuelve igual
 * desde `main.tex` que desde `sections/03-….tex`.
 *
 * Todo va con la sesión del usuario: el RLS del bucket ya deja escribir a un
 * editor del proyecto.
 */
import { extensionDe, PICS_DIR, plate, slug } from '~/shared/lib/asset-name'
import { MAX_FILE_BYTES } from '~/features/projects/lib/import-folder'

export interface AssetUpload {
  /** Ruta dentro del proyecto: `pics/QRT-482.png`. */
  path: string
  /** El nombre sin carpeta ni extensión; sirve de `\label{fig:…}`. */
  name: string
}

export function useProjectAssets(projectId: MaybeRefOrGetter<string | null | undefined>) {
  const supabase = useSupabaseClient()
  const user = useMe()

  /** URLs firmadas ya pedidas, con su caducidad: una por imagen y no una por pintado. */
  const signed = new Map<string, { url: string, until: number }>()
  const TTL_S = 3600

  function pid(): string | null {
    return toValue(projectId) ?? null
  }

  /**
   * Sube una imagen a `pics/` y devuelve su ruta.
   *
   * El nombre se comprueba contra las rutas que ya existen: sin `upsert`. Las
   * políticas de `project-assets` (`002_storage.sql`) dan `insert`, `select` y
   * `delete`, pero **no** `update`, así que sobrescribir un objeto fallaría —y
   * además pisaría la imagen de otro bloque sin avisar.
   */
  async function uploadImage(file: File, name?: string): Promise<AssetUpload> {
    const project = pid()
    if (!project) throw new Error('Este documento no está dentro de un proyecto.')

    const ext = extensionDe(file.type)
    if (!ext) throw new Error('Solo se pueden poner imágenes PNG o JPG, o un PDF.')
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`La imagen pesa ${mb(file.size)} MB; el tope son ${mb(MAX_FILE_BYTES)} MB.`)
    }

    const usadas = await usedNames(project)
    const propuesto = name ? slug(name) : ''
    let base = propuesto
    if (!base || usadas.has(`${base}${ext}`)) {
      if (propuesto && usadas.has(`${propuesto}${ext}`)) {
        throw new Error(`Ya hay una imagen que se llama «${propuesto}».`)
      }
      base = plate()
      for (let i = 0; i < 5 && usadas.has(`${base}${ext}`); i++) base = plate()
    }

    const path = `${PICS_DIR}/${base}${ext}`
    const storagePath = `${project}/${path}`

    const { error } = await supabase.storage
      .from('project-assets')
      .upload(storagePath, file, { contentType: file.type })
    if (error) throw error

    const { error: rowError } = await supabase.from('files').insert({
      project_id: project,
      path,
      kind: 'binary' as const,
      storage_path: storagePath,
      size_bytes: file.size,
      updated_by: user.value?.id
    })
    if (rowError) throw rowError

    return { path, name: base }
  }

  /** Los nombres de archivo que ya viven en `pics/`. */
  async function usedNames(project: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('files')
      .select('path')
      .eq('project_id', project)
      .like('path', `${PICS_DIR}/%`)
    if (error) throw error
    return new Set((data ?? []).map(row => (row.path as string).slice(PICS_DIR.length + 1)))
  }

  /**
   * URL para pintar la miniatura. El bucket es privado, así que se firma; se
   * guarda hasta un minuto antes de caducar para no firmar en cada repintado.
   */
  async function assetUrl(path: string): Promise<string | null> {
    const project = pid()
    if (!project || !path) return null

    const cached = signed.get(path)
    if (cached && cached.until > Date.now()) return cached.url

    const { data, error } = await supabase.storage
      .from('project-assets')
      .createSignedUrl(`${project}/${path}`, TTL_S)
    if (error || !data?.signedUrl) return null

    signed.set(path, { url: data.signedUrl, until: Date.now() + (TTL_S - 60) * 1000 })
    return data.signedUrl
  }

  return { uploadImage, assetUrl, canUpload: computed(() => pid() !== null) }
}

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1)
}
