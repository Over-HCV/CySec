/**
 * Rellena las derivadas ligeras de las imágenes que ya estaban subidas.
 *
 *   node --experimental-strip-types scripts/optimize-assets.ts [project_id]
 *
 * Desde `008_asset_proxy.sql`, cada binario puede tener una versión de 1400 px
 * sin perfil ICC ni canal alfa, y es con la que compilan `fast` y `normal`. Las
 * imágenes subidas antes no la tienen, así que se compilaban —cada vez— con
 * capturas de 3024 px que xdvipdfmx tiene que descomprimir y volver a comprimir
 * una por una. Esto las pone al día; el original no se toca y `full` lo sigue
 * usando.
 *
 * Hace lo mismo que `app/shared/lib/image-proxy.ts` pero con sharp, que además
 * quita el canal alfa y deja el PNG en paleta: así xdvipdfmx puede copiar el
 * stream tal cual, sin recodificar nada.
 *
 * Necesita la clave de servicio (salta el RLS): lee `apps/texel/.env`.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const MAX_PX = 1400
/** Por debajo de esto el original ya es ligero y no hay nada que ganar. */
const MIN_BYTES = 250 * 1024

const env = await loadEnv()
const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false }
})

const onlyProject = process.argv[2]

let query = admin
  .from('files')
  .select('id, project_id, path, storage_path, size_bytes, proxy_path')
  .eq('kind', 'binary')
  .is('proxy_path', null)
if (onlyProject) query = query.eq('project_id', onlyProject)

const { data, error } = await query
if (error) throw error

const rows = (data ?? []).filter(row => row.storage_path && (row.size_bytes ?? 0) >= MIN_BYTES)
console.log(`▸ ${rows.length} imágenes sin versión ligera`)

let antes = 0
let despues = 0

for (const row of rows) {
  const { data: blob, error: downloadError } = await admin.storage
    .from('project-assets').download(row.storage_path as string)
  if (downloadError || !blob) {
    console.warn(`  ✗ ${row.path}: ${downloadError?.message ?? 'sin objeto'}`)
    continue
  }

  const original = Buffer.from(await blob.arrayBuffer())
  let proxy: Buffer
  try {
    proxy = await sharp(original)
      .resize({ width: MAX_PX, withoutEnlargement: true })
      // Sobre blanco: es lo que quita el canal alfa, que es medio motivo de que
      // xdvipdfmx no pueda copiar el PNG. El otro es el perfil ICC, y sharp no
      // lo arrastra salvo que se le pida.
      .flatten({ background: '#ffffff' })
      .png({ palette: true, compressionLevel: 9 })
      .toBuffer()
  } catch (e) {
    console.warn(`  ✗ ${row.path}: no es una imagen que sharp entienda (${(e as Error).message})`)
    continue
  }

  if (proxy.byteLength >= original.byteLength) {
    console.log(`  = ${row.path}: la versión ligera no era más ligera; se deja el original`)
    continue
  }

  const target = proxyPath(row.storage_path as string)
  const { error: uploadError } = await admin.storage
    .from('project-assets')
    .upload(target, proxy, { contentType: 'image/png', upsert: true })
  if (uploadError) {
    console.warn(`  ✗ ${row.path}: ${uploadError.message}`)
    continue
  }

  const { error: rowError } = await admin.from('files')
    .update({ proxy_path: target, proxy_bytes: proxy.byteLength })
    .eq('id', row.id)
  if (rowError) {
    console.warn(`  ✗ ${row.path}: ${rowError.message}`)
    continue
  }

  antes += original.byteLength
  despues += proxy.byteLength
  console.log(`  ✓ ${row.path}: ${mb(original.byteLength)} → ${mb(proxy.byteLength)} MB`)
}

console.log(`▸ total: ${mb(antes)} MB → ${mb(despues)} MB`)

/** Mismo reparto que `image-proxy.ts`: el project_id sigue siendo el primer segmento. */
function proxyPath(storagePath: string): string {
  const slash = storagePath.indexOf('/')
  if (slash < 0) return `.proxy/${storagePath}`
  return `${storagePath.slice(0, slash)}/.proxy/${storagePath.slice(slash + 1)}`
}

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2)
}

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
