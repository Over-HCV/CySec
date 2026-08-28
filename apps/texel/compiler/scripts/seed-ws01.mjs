/**
 * Siembra un proyecto de Texel con el taller real de `latex/workshops/ws-01`.
 *
 * Sirve para probar el sistema con un documento de verdad: varios archivos,
 * clase propia (cysec.cls), bibliografía y compilación con XeLaTeX + biber.
 *
 *   node scripts/seed-ws01.mjs <email-del-dueño>
 *
 * Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// `latex/` es del repo del curso. `LATEX_DIR` manda; si no, se prueban los dos
// sitios donde suele estar: este repo dentro del monorepo (`apps/texel/`) y un
// clon de CySec al lado. Se comprueba al leer el primer archivo, que es cuando
// se puede nombrar la variable que falta.
const here = path.dirname(fileURLToPath(import.meta.url))
const latexRoot = process.env.LATEX_DIR
  ? path.resolve(process.env.LATEX_DIR)
  : [
      path.resolve(here, '../../../../latex'),
      path.resolve(here, '../../../CySec/latex')
    ].find(dir => existsSync(path.join(dir, 'tex/cysec.cls')))
    ?? path.resolve(here, '../../../CySec/latex')

// Origen en el repo → ruta dentro del proyecto de Texel. El archivo raíz queda
// arriba del todo para que \input{common/…} y \documentclass{cysec} resuelvan
// sin necesidad de TEXINPUTS (el compilador no lo usa).
const MAP = [
  ['workshops/ws-01/main.tex', 'main.tex'],
  ['workshops/ws-01/meta.tex', 'meta.tex'],
  ['workshops/ws-01/sections/00-introduction.tex', 'sections/00-introduction.tex'],
  ['workshops/ws-01/sections/01-confidencialidad.tex', 'sections/01-confidencialidad.tex'],
  ['workshops/ws-01/sections/02-integridad.tex', 'sections/02-integridad.tex'],
  ['workshops/ws-01/sections/03-disponibilidad.tex', 'sections/03-disponibilidad.tex'],
  ['workshops/ws-01/sections/04-aaa-dbir.tex', 'sections/04-aaa-dbir.tex'],
  ['workshops/ws-01/sections/05-conclussions.tex', 'sections/05-conclussions.tex'],
  ['tex/cysec.cls', 'cysec.cls'],
  ['tex/common/preamble.tex', 'common/preamble.tex'],
  ['tex/common/course.tex', 'common/course.tex'],
  ['tex/common/macros.tex', 'common/macros.tex'],
  ['tex/common/boxes.tex', 'common/boxes.tex'],
  ['tex/bib/refs.bib', 'bib/refs.bib']
]

// Se comprueba antes de tocar la base: si falla a mitad queda un proyecto vacío
// a nombre del usuario y hay que borrarlo a mano.
try {
  await readFile(path.join(latexRoot, 'tex/cysec.cls'), 'utf8')
} catch {
  throw new Error(
    `no encuentro el repo del curso en ${latexRoot}: clona Over-HCV/CySec al lado de este repo o pasa LATEX_DIR=/ruta/a/CySec/latex`
  )
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')

const email = process.argv[2]
if (!email) throw new Error('uso: pnpm seed:ws01 <email>')

const admin = createClient(url, key, { auth: { persistSession: false } })

const { data: users, error: usersError } = await admin.auth.admin.listUsers()
if (usersError) throw usersError
const owner = users.users.find(u => u.email === email)
if (!owner) throw new Error(`no existe un usuario con email ${email}`)

const { data: project, error: projectError } = await admin
  .from('projects')
  .insert({ name: 'Taller 1 — Introducción a ciberseguridad I', owner_id: owner.id, engine: 'xelatex' })
  .select()
  .single()
if (projectError) throw projectError

await admin.from('project_members').insert({
  project_id: project.id,
  user_id: owner.id,
  role: 'owner',
  added_by: owner.id
})

for (const [src, dest] of MAP) {
  const content = await readFile(path.join(latexRoot, src), 'utf8')
  const { error } = await admin.from('files').insert({
    project_id: project.id,
    path: dest,
    kind: 'text',
    content,
    size_bytes: Buffer.byteLength(content),
    updated_by: owner.id
  })
  if (error) throw new Error(`${dest}: ${error.message}`)
  console.log(`  + ${dest}`)
}

console.log(`\nProyecto ${project.id} sembrado para ${email}.`)
console.log(`Ábrelo en http://localhost:3000/p/${project.id}`)
