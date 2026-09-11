/**
 * Pone al día la capa compartida (`tex/common/*.tex`) de un proyecto ya creado.
 *
 *   node --experimental-strip-types scripts/sync-class.ts <project_id>          # enseña qué cambiaría
 *   node --experimental-strip-types scripts/sync-class.ts <project_id> --apply  # lo escribe
 *
 * Un proyecto se lleva su copia de la clase el día que nace, y nadie se la
 * vuelve a tocar: cuando la plantilla arregla algo —como la prueba de «cuerpo
 * vacío» de `boxes.tex`, que con xstring costaba 1,5 s por caja— los proyectos
 * que ya existen se quedan con la versión lenta. El editor ofrece lo mismo
 * desde la interfaz (`useClassSupport.actualizar`), pero solo para el recorte
 * de imágenes; esto es la versión de línea de comandos, y dice qué toca antes
 * de tocarlo.
 *
 * Solo `tex/common/*`: el resto del proyecto es del usuario.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { TEMPLATE_FILES } from '../app/features/projects/lib/template.generated.ts'

const projectId = process.argv[2]
const apply = process.argv.includes('--apply')
if (!projectId) throw new Error('uso: sync-class.ts <project_id> [--apply]')

const env = await loadEnv()
const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false }
})

const paths = Object.keys(TEMPLATE_FILES).filter(p => p.startsWith('tex/common/'))

const { data, error } = await admin
  .from('files')
  .select('id, path, content')
  .eq('project_id', projectId)
  .in('path', paths)
if (error) throw error

for (const row of data ?? []) {
  const nuevo = TEMPLATE_FILES[row.path as string]
  const viejo = (row.content as string | null) ?? ''
  if (nuevo === undefined || nuevo === viejo) {
    console.log(`  = ${row.path}`)
    continue
  }
  console.log(`  ${apply ? '→' : '≠'} ${row.path}: ${viejo.length} → ${nuevo.length} bytes`)
  if (!apply) continue

  const { error: updateError } = await admin.from('files')
    .update({ content: nuevo, size_bytes: Buffer.byteLength(nuevo) })
    .eq('id', row.id)
  if (updateError) throw updateError
}

if (!apply) console.log('▸ nada escrito; repite con --apply')

/** `apps/texel/.env`, que es donde vive la configuración maestra. */
async function loadEnv(): Promise<Record<string, string>> {
  const path = fileURLToPath(new URL('../../.env', import.meta.url))
  const text = await readFile(path, 'utf8')
  const out: Record<string, string> = { ...process.env as Record<string, string> }
  for (const line of text.split('\n')) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line.trim())
    if (match) out[match[1]!] = match[2]!.replace(/^["']|["']$/g, '')
  }
  if (!out.SUPABASE_URL || !out.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en apps/texel/.env')
  }
  return out
}
