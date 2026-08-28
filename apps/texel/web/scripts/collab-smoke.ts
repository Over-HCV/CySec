/**
 * Prueba de humo de la edición colaborativa, sin navegador.
 *
 * Levanta dos proveedores contra el mismo archivo (como dos pestañas), escribe
 * en ambos a la vez y comprueba que convergen y que el cambio queda persistido.
 *
 *   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=… \
 *   EMAIL=alice@test.local PASSWORD=secret123 \
 *   node --experimental-strip-types scripts/collab-smoke.ts
 */
import * as Y from 'yjs'
import { createClient } from '@supabase/supabase-js'
import { SupabaseYjsProvider } from '../app/features/editor/lib/supabase-yjs-provider.ts'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_ANON_KEY!
const email = process.env.EMAIL!
const password = process.env.PASSWORD!

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

async function session() {
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

const [clientA, clientB] = await Promise.all([session(), session()])

// Primer archivo del primer proyecto visible para este usuario.
const { data: file, error } = await clientA
  .from('files')
  .select('id, path, project_id')
  .eq('path', 'main.tex')
  .limit(1)
  .single()
if (error) throw error
console.log(`archivo: ${file.path} (${file.id})`)

const docA = new Y.Doc()
const docB = new Y.Doc()

const providerA = new SupabaseYjsProvider(docA, {
  supabase: clientA,
  fileId: file.id,
  user: { id: 'user-a', name: 'Alice A', color: '#1F4E79' }
})
const providerB = new SupabaseYjsProvider(docB, {
  supabase: clientB,
  fileId: file.id,
  user: { id: 'user-b', name: 'Alice B', color: '#8B2500' }
})

await providerA.connect()
await providerB.connect()
await wait(1500)   // suscripción a los canales

const before = docA.getText('content').toString()
console.log(`estado inicial: ${before.length} caracteres, iguales en ambos: ${before === docB.getText('content').toString()}`)

// Escritura simultánea en la misma posición: es el caso que rompe un
// "último que guarda gana" y que el CRDT tiene que resolver.
docA.getText('content').insert(0, '% AAA\n')
docB.getText('content').insert(0, '% BBB\n')
await wait(2000)

const textA = docA.getText('content').toString()
const textB = docB.getText('content').toString()

console.log('--- convergencia')
console.log('  A empieza por:', JSON.stringify(textA.slice(0, 14)))
console.log('  B empieza por:', JSON.stringify(textB.slice(0, 14)))
console.log('  ¿idénticos?  ', textA === textB)
console.log('  ¿conserva AAA y BBB?', textA.includes('% AAA') && textA.includes('% BBB'))
console.log('  ¿conserva el contenido previo?', textA.endsWith(before))

// Persistencia: el log de updates debe tener filas para este archivo.
await wait(2500)
const { count } = await clientA
  .from('doc_updates')
  .select('*', { count: 'exact', head: true })
  .eq('file_id', file.id)
console.log('--- persistencia')
console.log('  filas en doc_updates:', count)

// Un tercer cliente que entra después debe ver el resultado.
const clientC = await session()
const docC = new Y.Doc()
const providerC = new SupabaseYjsProvider(docC, {
  supabase: clientC,
  fileId: file.id,
  user: { id: 'user-c', name: 'Alice C', color: '#1B7A3D' }
})
await providerC.connect()
await wait(1000)
const textC = docC.getText('content').toString()
console.log('  cliente nuevo reconstruye lo mismo:', textC === textA)

providerA.destroy()
providerB.destroy()
providerC.destroy()
await wait(500)

const ok = textA === textB && textA.includes('% AAA') && textA.includes('% BBB') && textC === textA
console.log(ok ? '\nOK' : '\nFALLO')
process.exit(ok ? 0 : 1)
