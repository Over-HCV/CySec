// Tipos de la base de datos.
//
// Escritos a mano para arrancar; una vez el proyecto exista en Supabase se
// regeneran con:
//   supabase gen types typescript --local > app/shared/types/database.ts

export type ProjectRole = 'viewer' | 'editor' | 'owner'
export type FileKind = 'text' | 'binary'
export type TexEngine = 'xelatex' | 'pdflatex' | 'lualatex'
export type CompileStatus = 'queued' | 'running' | 'success' | 'error'

export type Profile = {
  id: string
  display_name: string
  email: string | null
  color: string
  created_at: string
}

export type Project = {
  id: string
  name: string
  owner_id: string
  root_file: string
  engine: TexEngine
  created_at: string
  updated_at: string
}

export type ProjectMember = {
  project_id: string
  user_id: string
  role: ProjectRole
  added_by: string | null
  created_at: string
}

export type ProjectInvite = {
  id: string
  project_id: string
  token: string
  email: string | null
  role: ProjectRole
  created_by: string
  expires_at: string
  accepted_by: string | null
  accepted_at: string | null
  created_at: string
}

export type ProjectFile = {
  id: string
  project_id: string
  path: string
  kind: FileKind
  content: string | null
  storage_path: string | null
  size_bytes: number
  updated_by: string | null
  created_at: string
  updated_at: string
}

/** Un problema del log de LaTeX, ya parseado por el compilador. */
export type Diagnostic = {
  file: string
  line: number | null
  level: 'error' | 'warning' | 'info'
  message: string
}

export type Compilation = {
  id: string
  project_id: string
  status: CompileStatus
  engine: TexEngine
  root_file: string
  /** Con qué profundidad se compiló. Null en las filas anteriores a 006_compile_cache. */
  mode: 'normal' | 'fast' | 'full' | null
  /** Huella de las fuentes: dos compilaciones que la comparten dan el mismo PDF. */
  source_hash: string | null
  log: string | null
  diagnostics: Diagnostic[]
  pdf_path: string | null
  synctex_path: string | null
  duration_ms: number | null
  created_by: string | null
  created_at: string
  finished_at: string | null
}

/** Posición de un colaborador, tal como viaja en el awareness de Yjs. */
export type PeerState = {
  user: { id: string, name: string, color: string }
  cursor?: { anchor: number, head: number }
  fileId?: string
}

// ── Sincronización con GitHub ────────────────────────────────────────────────

/** Qué hacer con un archivo que no está igual en las dos partes. */
export type ChangeAction = 'pull' | 'pull-delete' | 'push' | 'push-delete' | 'conflict'

export type Change = {
  path: string
  action: ChangeAction
  /** Sha del blob en el proyecto, o `null` si ya no está. */
  local: string | null
  /** Sha del blob en el repositorio, o `null` si ya no está. */
  remote: string | null
  /** Sha de la última sincronización, o `null` si el archivo es nuevo. */
  base: string | null
}

export type SyncStatus = {
  behind: Change[]
  ahead: Change[]
  conflicts: Change[]
}

/** Enlace de un proyecto con una carpeta de un repositorio. */
export type ProjectRepo = {
  project_id: string
  installation_id: number
  owner: string
  repo: string
  branch: string
  path_map: { project: string, repo: string }[]
  last_synced_sha: string | null
  last_synced_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
