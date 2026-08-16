# Texel — editor LaTeX colaborativo

Editar `.tex` entre varias personas a la vez, compilar y ver el PDF, como
Overleaf. Autocontenido: web, backend de compilación, base de datos e
infraestructura viven en esta carpeta.

```
web/        Nuxt 4 · @nuxtjs/supabase · UnoCSS · CodeMirror 6 · Yjs · pdf.js
compiler/   Fastify + TeX Live en Docker → Cloud Run
supabase/   migraciones SQL, políticas RLS y Edge Functions
infra/      deploy.sh (Artifact Registry + Cloud Run + Secret Manager)
```

## Cómo encaja

| pieza | responsabilidad |
|---|---|
| Supabase Postgres | proyectos, miembros, invitaciones, archivos, log de Yjs, compilaciones |
| Supabase Realtime | `broadcast` para los updates de Yjs y los cursores; `postgres_changes` para el árbol de archivos y las compilaciones |
| Supabase Storage | `project-assets` (imágenes) y `compiled` (PDF + `.synctex.gz`), ambos privados |
| Cloud Run | ejecuta `latexmk`, sube resultados, responde consultas de SyncTeX |

La edición colaborativa es CRDT (Yjs): cada cliente aplica los cambios ajenos sin
esperar a un servidor, y el texto converge aunque dos personas escriban en la
misma línea. El proveedor propio está en
`web/app/features/editor/lib/supabase-yjs-provider.ts`.

## Desarrollo

```sh
# 1. Base de datos local (necesita Docker en marcha)
cd supabase && supabase start        # imprime las claves anon y service_role
supabase db reset                    # aplica migrations/

# 2. Compilador
cd ../compiler && cp .env.example .env   # rellenar con las claves de arriba
docker build -t texel-compiler .
docker run --rm -p 8080:8080 --env-file .env texel-compiler

# 3. Web
cd ../web && cp .env.example .env
pnpm install && pnpm dev             # http://localhost:3000
```

## Empezar con un proyecto que ya existe

En la lista de proyectos, **Cargar proyecto** abre el selector de carpetas (o se
arrastra la carpeta encima). Se conservan las subcarpetas (`sections/`, `bib/`),
los `.tex`/`.bib` van a la tabla `files` y las imágenes a `project-assets`. Se
descartan los subproductos de compilar (`.aux`, `.log`, `.synctex.gz`, …),
`.git/` y `node_modules/`. El `.tex` raíz y el motor se deducen del contenido:
`main.tex` o el que declare la clase, y `xelatex` si usa `fontspec` o `cysec`.

Las reglas viven en `web/app/features/projects/lib/import-folder.ts` y se prueban
sin red (`web/test/import-folder.test.ts`); la subida, en
`web/app/shared/composables/useProjectImport.ts`.

## Hoja de ruta

- [`docs/visual-editor.md`](docs/visual-editor.md) — modo visual por bloques
  (tipo Notion) sincronizado con el LaTeX, para que colaboren personas que no
  escriben LaTeX. Plan con hitos y casillas; **M0–M4 hechos** y M5 a medias: un
  `\begin…\end` es un bloque que contiene a otros, con plegado y anidamiento sin
  límite. Queda el menú `/`, párrafos con marcas y pulido.

## Pruebas

```sh
# Parsers del modo visual: ida y vuelta byte a byte contra los archivos reales
# de ../../latex, más convergencia de dos documentos Yjs. Sin red.
cd web && pnpm test


# Sembrar un proyecto con el taller real de ../../latex/workshops/ws-01
cd compiler && SUPABASE_URL=http://127.0.0.1:54321 \
  SUPABASE_SERVICE_ROLE_KEY=<service key> pnpm seed:ws01 tu@correo

# Edición concurrente sin navegador: dos clientes escriben a la vez y deben
# converger, persistir y ser reconstruibles por un tercero.
cd web && SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<anon key> \
  EMAIL=tu@correo PASSWORD=… node --experimental-strip-types scripts/collab-smoke.ts
```

## Despliegue

```sh
./infra/deploy.sh                    # compilador → Cloud Run
supabase link --project-ref <ref> && supabase db push
supabase functions deploy flush-doc
```

El frontend puede ir en Cloud Run igual (`nuxt build` genera un servidor Node) o
en cualquier host estático con SSR.

## Cuentas y costes

- Cloud Run: 2M peticiones y 180k vCPU-s gratis al mes — de sobra.
- Artifact Registry: 0,5 GB gratis; la imagen de TeX Live pesa más, así que se
  pagan unos céntimos al mes. Recortable con `scheme-basic` + `tlmgr` selectivo.
- Supabase free: 500 MB de base, 1 GB de Storage, 200 conexiones de Realtime.
  Los updates de Yjs se agrupan cada 50 ms para no gastar el cupo de mensajes.

## Seguridad

- Todo el acceso a datos pasa por RLS sobre `project_members`; la función
  `is_member(project_id, rol)` es `security definer` para evitar recursión.
- El compilador valida el JWT de Supabase y la pertenencia al proyecto antes de
  tocar nada, y corre `latexmk -no-shell-escape` como usuario sin privilegios:
  un `.tex` subido no puede ejecutar comandos.
- Las invitaciones se canjean por RPC (`accept_invite`), nunca por `INSERT`
  directo del cliente.
