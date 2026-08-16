/**
 * Crear un proyecto a partir de una carpeta del ordenador.
 *
 * Reutiliza la RPC `create_project` — que ya crea proyecto, membresía de dueño
 * y un `main.tex` de arranque en una transacción — y encima escribe los
 * archivos reales. El `main.tex` de arranque se resuelve con `upsert`: si la
 * carpeta trae el suyo, gana el de la carpeta; si no trae ninguno, se borra.
 *
 * Todo va con la sesión del usuario: el RLS de `files` y de `project-assets`
 * ya deja escribir a un editor del proyecto, así que no hace falta clave de
 * servicio.
 */
import {
  guessEngine, pickRoot, planImport, type ImportPlan, type PlannedFile
} from '~/features/projects/lib/import-folder'
import type { TexEngine } from '~/shared/types/database'

/** Filas por lote. Ni una a una (lento) ni todas juntas (una carga enorme). */
const BATCH = 40

export interface ImportProgress {
  done: number
  total: number
  label: string
}

export function useProjectImport() {
  const supabase = useSupabaseClient()
  const progress = ref<ImportProgress | null>(null)

  /**
   * Crea el proyecto y sube la carpeta. Devuelve el id y lo que se dejó fuera.
   *
   * Si algo falla a mitad, borra el proyecto recién creado: media importación
   * es peor que ninguna, porque compila mal y no se ve por qué.
   */
  async function importFolder(
    entries: { relativePath: string, file: File }[],
    name?: string
  ): Promise<{ id: string, plan: ImportPlan }> {
    const plan = planImport(entries)
    if (!plan.texts.length && !plan.binaries.length) {
      throw new Error('La carpeta no tiene ningún archivo que se pueda importar.')
    }

    const total = plan.texts.length + plan.binaries.length
    progress.value = { done: 0, total, label: 'Leyendo la carpeta…' }

    // Leer antes de crear nada: si el disco falla, no queda proyecto vacío.
    const texts = await Promise.all(plan.texts.map(async f => ({
      path: f.path,
      content: await f.file.text()
    })))

    const root = pickRoot(texts)
    const engine: TexEngine = guessEngine(texts.find(t => t.path === root)?.content ?? '')
    plan.root = root

    const { data, error } = await supabase.rpc('create_project', {
      p_name: (name ?? plan.name).slice(0, 120),
      p_engine: engine
    })
    if (error) throw error
    const id = data as string

    try {
      await writeTexts(id, texts)
      await writeBinaries(id, plan.binaries)
      // La RPC deja un `main.tex` de ejemplo; sobra si la carpeta no traía uno.
      if (!texts.some(t => t.path === 'main.tex')) {
        await supabase.from('files').delete().eq('project_id', id).eq('path', 'main.tex')
      }
      if (root && root !== 'main.tex') {
        const { error: rootError } = await supabase.from('projects')
          .update({ root_file: root }).eq('id', id)
        if (rootError) throw rootError
      }
    } catch (e) {
      await supabase.from('projects').delete().eq('id', id)
      progress.value = null
      throw e
    }

    progress.value = null
    return { id, plan }
  }

  async function writeTexts(projectId: string, texts: { path: string, content: string }[]) {
    for (let i = 0; i < texts.length; i += BATCH) {
      const chunk = texts.slice(i, i + BATCH)
      bump(chunk.length, chunk[0]!.path)
      const { error } = await supabase.from('files').upsert(chunk.map(t => ({
        project_id: projectId,
        path: t.path,
        kind: 'text' as const,
        content: t.content,
        size_bytes: new Blob([t.content]).size
      })), { onConflict: 'project_id,path' })
      if (error) throw error
    }
  }

  /**
   * Los binarios van a Storage con el id del proyecto de primer segmento, que
   * es lo que miran las políticas del bucket, y la fila solo guarda el puntero.
   */
  async function writeBinaries(projectId: string, binaries: PlannedFile[]) {
    for (const item of binaries) {
      bump(1, item.path)
      const storagePath = `${projectId}/${item.path}`
      const { error } = await supabase.storage
        .from('project-assets')
        .upload(storagePath, item.file, { upsert: true, contentType: item.file.type || undefined })
      if (error) throw error

      const { error: rowError } = await supabase.from('files').upsert({
        project_id: projectId,
        path: item.path,
        kind: 'binary' as const,
        storage_path: storagePath,
        size_bytes: item.file.size
      }, { onConflict: 'project_id,path' })
      if (rowError) throw rowError
    }
  }

  function bump(n: number, label: string) {
    if (!progress.value) return
    progress.value = {
      done: Math.min(progress.value.done + n, progress.value.total),
      total: progress.value.total,
      label
    }
  }

  return { progress, importFolder }
}

/**
 * Recorre lo que se ha soltado y devuelve los archivos con su ruta relativa.
 *
 * Arrastrar una carpeta no da `File`s sino entradas del sistema de archivos, y
 * hay que bajar por ellas a mano: sin esto se perderían `sections/` y `bib/`,
 * que es justo la estructura que se quiere conservar.
 */
export async function readDropped(items: DataTransferItemList): Promise<{ relativePath: string, file: File }[]> {
  const roots: FileSystemEntry[] = []
  for (const item of Array.from(items)) {
    const entry = item.webkitGetAsEntry?.()
    if (entry) roots.push(entry)
  }

  const out: { relativePath: string, file: File }[] = []
  for (const entry of roots) await walkEntry(entry, entry.name, out)
  return out
}

async function walkEntry(
  entry: FileSystemEntry,
  path: string,
  out: { relativePath: string, file: File }[]
): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject))
    out.push({ relativePath: path, file })
    return
  }
  if (!entry.isDirectory) return

  const reader = (entry as FileSystemDirectoryEntry).createReader()
  // `readEntries` devuelve la carpeta por tandas: hay que insistir hasta vacío.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject))
    if (!batch.length) break
    for (const child of batch) await walkEntry(child, `${path}/${child.name}`, out)
  }
}
