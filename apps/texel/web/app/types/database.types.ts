/**
 * Tipo `Database` que consume @nuxtjs/supabase (opción `types` en nuxt.config).
 * Sin él, el cliente resuelve cada tabla como `never` y todo `insert`/`update`
 * falla en TypeScript.
 *
 * Escrito a mano contra supabase/migrations/001_initial_schema.sql. Cuando el
 * proyecto exista en Supabase, se regenera:
 *   supabase gen types typescript --local > app/types/database.types.ts
 */
import type {
  Profile, Project, ProjectMember, ProjectInvite, ProjectFile, Compilation,
  ProjectRole, TexEngine, FileKind, CompileStatus
} from '~/shared/types/database'

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>
      projects: Table<Project, Pick<Project, 'name' | 'owner_id'> & Partial<Project>>
      project_members: Table<
        ProjectMember,
        Pick<ProjectMember, 'project_id' | 'user_id'> & Partial<ProjectMember>
      >
      project_invites: Table<
        ProjectInvite,
        Pick<ProjectInvite, 'project_id' | 'created_by'> & Partial<ProjectInvite>
      >
      files: Table<ProjectFile, Pick<ProjectFile, 'project_id' | 'path'> & Partial<ProjectFile>>
      doc_updates: Table<
        { seq: number, file_id: string, update: string, client_id: string, created_by: string | null, created_at: string },
        { file_id: string, update: string, client_id: string, created_by?: string | null }
      >
      doc_snapshots: Table<
        { file_id: string, state: string, through_seq: number, updated_at: string },
        { file_id: string, state: string, through_seq?: number }
      >
      compilations: Table<
        Compilation,
        Pick<Compilation, 'project_id' | 'engine' | 'root_file'> & Partial<Compilation>
      >
    }
    Views: { [_ in never]: never }
    Functions: {
      create_project: {
        Args: { p_name: string, p_engine?: TexEngine }
        Returns: string
      }
      accept_invite: {
        Args: { p_token: string }
        Returns: string
      }
      invite_preview: {
        Args: { p_token: string }
        Returns: { project_name: string, role: ProjectRole, expired: boolean, used: boolean }[]
      }
      is_member: {
        Args: { pid: string, min_role?: ProjectRole }
        Returns: boolean
      }
    }
    Enums: {
      project_role: ProjectRole
      tex_engine: TexEngine
      file_kind: FileKind
      compile_status: CompileStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}
