# Texel — editor LaTeX colaborativo

Editar `.tex` entre varias personas a la vez, compilar y ver el PDF, como
Overleaf. Autocontenido: web, backend de compilación, base de datos e
infraestructura viven en esta carpeta.

```
web/        Nuxt 4 · @nuxtjs/supabase · UnoCSS · CodeMirror 6 · Yjs · pdf.js
            (y las rutas /api/github, que sincronizan con el repo del curso)
compiler/   Fastify + TeX Live en Docker → Cloud Run
supabase/   migraciones SQL, políticas RLS y Edge Functions
infra/      deploy.sh (Artifact Registry + Cloud Run + Secret Manager)
```

El material del curso está dos carpetas más arriba, en `latex/` de este mismo
repositorio: de ahí sale la plantilla de «Nuevo proyecto» y con él sincronizan
los talleres. Los scripts lo encuentran solos; si trabajas con Texel fuera del
monorepo, `CYSEC_DIR` (tests), `TEXEL_LATEX_DIR` (plantilla) y `LATEX_DIR`
(`seed:ws01`) dicen dónde está.

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

## Atajos del editor

| | |
|---|---|
| `⌘S` / `Ctrl+S` | formatea el `.tex` y guarda |
| `⌘⏎` / `Ctrl+⏎` | guarda y compila |

El formateador (`web/app/features/editor/lib/format-tex.ts`) es a propósito corto
de miras: espacios de sobra, líneas en blanco de más, indentación por entorno y
salto final. No reordena ni parte párrafos, así que **no puede cambiar el PDF**,
y se aplica por parches sobre el documento compartido: quien esté escribiendo en
otro párrafo no pierde ni el texto ni el cursor.

## Compilar

El botón partido de la cabecera compila; el chevron abre las opciones.

| modo | qué hace | cuándo |
|---|---|---|
| **Normal** | las pasadas que hagan falta y biber; la bibliografía se rehace siempre | por defecto |
| **Rápido (borrador)** | una pasada, sin bibliografía, reutilizando el `.bbl` anterior | mientras escribes |
| **Recompilar desde cero** | tira la caché y rehace el documento entero | cuando algo se quedó atrás |

**Es incremental.** El compilador mantiene un directorio de trabajo por proyecto
(`/tmp/texel-<id>`), escribe solo los archivos que cambiaron y conserva el
`.fdb_latexmk` de latexmk, así que latexmk puede decidir qué rehacer en vez de
repetirlo todo. Medido sobre el taller 1 (xelatex + biber, 6 secciones):

| | antes | ahora |
|---|---|---|
| sin cambios | ~85 s | ~0,1 s (ni se compila: misma huella ⇒ se devuelve el PDF anterior) |
| una sección tocada | ~85 s | ~20 s (una pasada) |
| `.bib` tocado | ~85 s | ~70 s (biber + las pasadas para que cuadren las citas) |
| instancia fría | ~85 s | ~20 s (se restaura `build/` del bucket) |

Una pasada de LaTeX procesa **el documento entero**, siempre: no existe compilar
media sección. Lo que se ahorra son las pasadas de más, biber cuando la
bibliografía no ha cambiado, y las compilaciones en las que no ha cambiado nada.
Tocar `common/preamble.tex` o `cysec.cls` sí rehace todo, y es lo correcto.

**Por qué existe «Recompilar desde cero»:** entre compilaciones se guarda un
tarball de `build/` en el bucket `compiled`. El `.bbl` (la bibliografía ya
resuelta) solo se restaura en modo rápido; en normal se rehace siempre, porque
restaurarlo tapaba los fallos de biber y el PDF salía con las referencias de la
primera compilación sin decir nada. Si aun así algo se queda atrás, ese botón
borra la caché del proyecto y empieza limpio. Los errores de biber ahora salen
en el panel de problemas.

## Empezar

**Nuevo proyecto** crea la plantilla del curso completa —`cysec.cls`,
`tex/common/*`, la bibliografía y un taller en `workshops/ws-01/`—, así que
compila desde el primer clic. La plantilla se genera desde el repo:

```sh
cd web && pnpm build:template   # relee ../../latex y regenera template.generated.ts
```

Si cambias `latex/tex/**` o `latex/workshops/_template/**` y no la regeneras,
`pnpm test` lo dice. **Duplicar**, en la lista de proyectos, copia un proyecto
entero (archivos y adjuntos) para partir del taller anterior.

## Cargar un proyecto que ya existe

En la lista de proyectos, **Cargar proyecto** abre el selector de carpetas (o se
arrastra la carpeta encima). Se conservan las subcarpetas (`sections/`, `bib/`),
los `.tex`/`.bib` van a la tabla `files` y las imágenes a `project-assets`. Se
descartan los subproductos de compilar (`.aux`, `.log`, `.synctex.gz`, …),
`.git/` y `node_modules/`. El `.tex` raíz y el motor se deducen del contenido:
`main.tex` o el que declare la clase, y `xelatex` si usa `fontspec` o `cysec`.

Las reglas viven en `web/app/features/projects/lib/import-folder.ts` y se prueban
sin red (`web/test/import-folder.test.ts`); la subida, en
`web/app/shared/composables/useProjectImport.ts`.

## Sincronizar con GitHub

Un taller se escribe en dos sitios: aquí y en el repositorio del curso
(`Over-HCV/CySec`), desde el editor de tu ordenador. **GitHub**, en la fila del
proyecto o en la cabecera del editor, enlaza el proyecto con la carpeta de un
taller y da los dos botones: **Traer** baja lo que cambió en el repo y **Subir**
lo manda en un commit sobre `main`.

Las rutas del proyecto y las del repo no coinciden, y esa es toda la
dificultad: aquí un proyecto *es* un taller —su raíz es `main.tex`— mientras que
en el repo vive en `latex/workshops/ws-01/` y la clase del curso es compartida,
en `latex/tex/`. El mapa por defecto traduce las dos cosas, y lo que se envía a
un sitio no puede volver de otro
(`web/server/utils/gh/mapping.ts`, probado en `web/test/gh-mapping.test.ts`).

Qué se sincroniza y qué no: entran los `.tex`, `.bib`, `.cls` y las imágenes;
se quedan fuera los subproductos de compilar, `.git/` y los archivos enormes,
con las mismas reglas que la importación de una carpeta.

Cuando un archivo cambió en los dos sitios, no se toca: aparece como conflicto y
hay que decir qué lado gana. Y si hay algo por traer, subir se rechaza —el
commit se construye sobre el árbol remoto de ese momento, así que subir a ciegas
dejaría la comparación mintiendo—.

Traer un archivo no escribe en `files.content` a secas: entra en el documento
Yjs como una edición más, con el parche mínimo, y se emite por Realtime. Quien
lo tenga abierto ve el cambio sin recargar y no lo pisa con su siguiente
volcado (`web/server/utils/gh/yjs.ts`).

### Ponerlo en marcha

1. Crear una **GitHub App** (Settings → Developer settings → GitHub Apps):
   permisos de repositorio **Contents: read & write** y **Metadata: read**;
   Callback URL `https://<tu-dominio>/api/github/callback`; sin webhook.
2. Guardar `GITHUB_APP_ID`, `GITHUB_APP_SLUG` y `GITHUB_APP_PRIVATE_KEY` en el
   entorno del servidor (ver `web/.env.example`).
3. Aplicar las migraciones: `supabase db push` (o `supabase db reset` en local).
4. En Texel: **GitHub → Instalar la App** en el repositorio del curso, luego
   **Buscar repositorios**, elegir repo, rama y carpeta del taller, y **Enlazar**.

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
