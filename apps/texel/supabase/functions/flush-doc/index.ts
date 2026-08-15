/**
 * flush-doc — compacta el log de Yjs y vuelca el texto plano.
 *
 * El log `doc_updates` crece con cada pulsación. Esta función:
 *   1. reconstruye el documento (snapshot + updates pendientes),
 *   2. guarda un snapshot nuevo y borra los updates ya incorporados,
 *   3. escribe el texto resultante en `files.content`, que es lo que lee el
 *      compilador (y lo que ve quien abre el archivo por primera vez).
 *
 * Se invoca desde el cliente al cerrar un archivo y, si se quiere, por cron con
 * pg_cron (cada 5 minutos) llamando a esta misma función.
 *
 * Desplegar: supabase functions deploy flush-doc
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as Y from 'https://esm.sh/yjs@13.6.24'
import { decodeBase64, encodeBase64 } from 'jsr:@std/encoding/base64'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
)

Deno.serve(async (req) => {
  const { fileId } = await req.json().catch(() => ({ fileId: null }))
  if (!fileId) {
    return new Response(JSON.stringify({ error: 'falta fileId' }), { status: 400 })
  }

  const doc = new Y.Doc()

  const { data: snapshot } = await admin
    .from('doc_snapshots')
    .select('state, through_seq')
    .eq('file_id', fileId)
    .maybeSingle()

  if (snapshot?.state) Y.applyUpdate(doc, decodeBase64(snapshot.state))

  const { data: updates } = await admin
    .from('doc_updates')
    .select('seq, update')
    .eq('file_id', fileId)
    .gt('seq', snapshot?.through_seq ?? 0)
    .order('seq', { ascending: true })

  if (!updates?.length) {
    return new Response(JSON.stringify({ ok: true, compacted: 0 }), {
      headers: { 'content-type': 'application/json' }
    })
  }

  for (const row of updates) Y.applyUpdate(doc, decodeBase64(row.update))

  const through = updates.at(-1)!.seq
  const state = encodeBase64(Y.encodeStateAsUpdate(doc))
  const text = doc.getText('content').toString()

  await admin.from('doc_snapshots').upsert({
    file_id: fileId,
    state,
    through_seq: through,
    updated_at: new Date().toISOString()
  })

  await admin.from('files').update({
    content: text,
    size_bytes: new TextEncoder().encode(text).length
  }).eq('id', fileId)

  // Ya están dentro del snapshot: el log puede podarse.
  await admin.from('doc_updates').delete().eq('file_id', fileId).lte('seq', through)

  return new Response(JSON.stringify({ ok: true, compacted: updates.length, through }), {
    headers: { 'content-type': 'application/json' }
  })
})
