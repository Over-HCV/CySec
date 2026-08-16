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
  guessEngine, missingSharedLayer, pickRoot, planImport,
  type ImportPlan, type PlannedFile
} from '~/features/projects/lib/import-folder'
import { TEMPLATE_FILES, TEMPLATE_ROOT } from '~/features/projects/lib/template.generated'
import type { ProjectFile, TexEngine } from '~/shared/types/database'

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

    // Una carpeta de taller no trae la clase del curso: vive un nivel más
    // arriba en el repo (`latex/tex/`). Sin esto el proyecto nace roto y el
    // primer clic en Compilar solo dice «File `cysec.cls' not found».
    const layer = missingSharedLayer(
      [...texts, ...plan.binaries.map(b => ({ path: b.path }))],
      TEMPLATE_FILES
    )
    for (const [path, content] of Object.entries(layer)) texts.push({ path, content })
    plan.added = Object.keys(layer)
    if (progress.value) progress.value = { ...progress.value, total: total + plan.added.length }

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

  /**
   * Crea un proyecto a partir de la plantilla del repo: la capa compartida
   * (`cysec.cls`, `tex/common/*`, la bibliografía) y un taller listo para
   * escribir. Es lo que hace que un proyecto nuevo compile al primer clic, en
   * vez de nacer con un `main.tex` de ejemplo que no encuentra su clase.
   */
  async function createFromTemplate(name: string): Promise<string> {
    const texts = Object.entries(TEMPLATE_FILES).map(([path, content]) => ({ path, content }))
    progress.value = { done: 0, total: texts.length, label: 'Creando desde la plantilla…' }

    const { data, error } = await supabase.rpc('create_project', {
      p_name: name.slice(0, 120),
      p_engine: 'xelatex' as TexEngine
    })
    if (error) { progress.value = null; throw error }
    const id = data as string

    try {
      await writeTexts(id, texts)
      // La RPC deja un `main.tex` de ejemplo. Si la plantilla trae el suyo, el
      // `upsert` ya lo ha sustituido; borrarlo aquí se llevaría el bueno.
      if (!texts.some(t => t.path === 'main.tex')) {
        await supabase.from('files').delete().eq('project_id', id).eq('path', 'main.tex')
      }
      const { error: rootError } = await supabase.from('projects')
        .update({ root_file: TEMPLATE_ROOT }).eq('id', id)
      if (rootError) throw rootError
    } catch (e) {
      await supabase.from('projects').delete().eq('id', id)
      progress.value = null
      throw e
    }

    progress.value = null
    return id
  }

  /**
   * Añade a un proyecto ya creado la capa compartida que le falte.
   *
   * Es la misma decisión que toma `importFolder`, pero para lo que se subió
   * antes de que existiera esa inyección: en vez de borrar el proyecto y
   * volver a arrastrar la carpeta, se completan los archivos que faltan.
   * Devuelve las rutas escritas (vacío si no faltaba nada).
   *
   * Escribe con la sesión del usuario: el RLS de `files` ya deja escribir a
   * cualquier editor del proyecto.
   */
  async function addCourseLayer(
    projectId: string,
    files: { path: string, content?: string }[]
  ): Promise<string[]> {
    const layer = missingSharedLayer(files, TEMPLATE_FILES)
    const texts = Object.entries(layer).map(([path, content]) => ({ path, content }))
    if (!texts.length) return []

    progress.value = { done: 0, total: texts.length, label: 'Añadiendo la capa del curso…' }
    try {
      await writeTexts(projectId, texts)
    } finally {
      progress.value = null
    }
    return texts.map(t => t.path)
  }

  /**
   * Copia un proyecto entero a uno nuevo: filas de `files` y objetos de
   * `project-assets`. Es «parto del taller anterior y sigo» sin bajar nada al
   * disco.
   *
   * Se copia desde `files.content`, que es lo que el compilador lee; si alguien
   * tiene el archivo abierto con cambios sin volcar, la copia se queda en el
   * último guardado. Es la misma foto que compilaría ahora mismo.
   */
  async function duplicateProject(source: { id: string, name: string, root_file: string, engine: TexEngine }): Promise<string> {
    const { data: rows, error: readError } = await supabase
      .from('files')
      .select('path, kind, content, storage_path, size_bytes')
      .eq('project_id', source.id)
    if (readError) throw readError

    const files = (rows ?? []) as Pick<ProjectFile, 'path' | 'kind' | 'content' | 'storage_path' | 'size_bytes'>[]
    progress.value = { done: 0, total: files.length, label: `Copiando ${source.name}…` }

    const { data, error } = await supabase.rpc('create_project', {
      p_name: `${source.name} (copia)`.slice(0, 120),
      p_engine: source.engine
    })
    if (error) { progress.value = null; throw error }
    const id = data as string

    try {
      await writeTexts(id, files.filter(f => f.kind === 'text').map(f => ({
        path: f.path,
        content: f.content ?? ''
      })))

      for (const file of files.filter(f => f.kind === 'binary' && f.storage_path)) {
        bump(1, file.path)
        const { data: blob, error: downloadError } = await supabase.storage
          .from('project-assets').download(file.storage_path!)
        if (downloadError) throw downloadError

        const storagePath = `${id}/${file.path}`
        const { error: uploadError } = await supabase.storage
          .from('project-assets').upload(storagePath, blob, { upsert: true })
        if (uploadError) throw uploadError

        const { error: rowError } = await supabase.from('files').upsert({
          project_id: id,
          path: file.path,
          kind: 'binary' as const,
          storage_path: storagePath,
          size_bytes: file.size_bytes
        }, { onConflict: 'project_id,path' })
        if (rowError) throw rowError
      }

      if (!files.some(f => f.path === 'main.tex')) {
        await supabase.from('files').delete().eq('project_id', id).eq('path', 'main.tex')
      }
      const { error: rootError } = await supabase.from('projects')
        .update({ root_file: source.root_file }).eq('id', id)
      if (rootError) throw rootError
    } catch (e) {
      await supabase.from('projects').delete().eq('id', id)
      progress.value = null
      throw e
    }

    progress.value = null
    return id
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

  return { progress, importFolder, createFromTemplate, duplicateProject, addCourseLayer }
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
