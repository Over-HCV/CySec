-- 005_github_sync.sql — enlazar un proyecto con una carpeta de un repo de GitHub.
--
-- Un taller se escribe en dos sitios: en el editor y en el repositorio del
-- curso, desde VS Code. Estas tablas guardan a qué carpeta de qué repo apunta
-- cada proyecto y en qué punto se quedó la última sincronización, que es lo que
-- permite decidir después si un archivo cambió aquí, allí o en los dos sitios.
--
-- Nada de esto lo escribe el cliente: las rutas del servidor validan el rol y
-- escriben con la clave de servicio. Las políticas de abajo son para *leer* el
-- estado del enlace desde la interfaz.

-- ─────────────────────────────────────────────────────────────────────────────
-- Instalaciones de la GitHub App
-- ─────────────────────────────────────────────────────────────────────────────

-- Una fila por instalación de la App en una cuenta u organización. El token con
-- el que se habla con GitHub se acuña en cada petición a partir del id y de la
-- clave privada de la App: aquí no se guarda ningún secreto.
create table github_installations (
  id            bigint primary key,          -- installation_id de GitHub
  user_id       uuid not null references auth.users on delete cascade,
  account_login text not null,               -- dueño de la cuenta donde se instaló
  created_at    timestamptz not null default now()
);

create index on github_installations (user_id);

alter table github_installations enable row level security;

create policy "instalaciones: cada quien ve las suyas"
  on github_installations for select to authenticated using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Enlace proyecto ↔ repositorio
-- ─────────────────────────────────────────────────────────────────────────────

-- `path_map` traduce entre las rutas del proyecto y las del repo, porque no
-- coinciden: en Texel un proyecto *es* un taller y su raíz es `main.tex`,
-- mientras que en el repo el taller vive en `latex/workshops/ws-01/` y la capa
-- compartida —la clase, el preámbulo, la bibliografía— en `latex/tex/`. Sin
-- esta traducción, subir un proyecto machacaría la clase del curso con la copia
-- que lleva dentro.
--
--   [{"project": "",          "repo": "latex/workshops/ws-01"},
--    {"project": "tex/",      "repo": "latex/tex/"},
--    {"project": "latexmkrc", "repo": "latex/latexmkrc"}]
--
-- Gana la regla con el prefijo de proyecto más largo, así que la de `tex/` se
-- impone a la del taller aunque esta case con todo.
create table project_repos (
  project_id      uuid primary key references projects on delete cascade,
  installation_id bigint not null references github_installations on delete cascade,
  owner           text not null,
  repo            text not null,
  branch          text not null default 'main',
  path_map        jsonb not null,
  -- Commit sobre el que se hizo la última sincronización con éxito. Es la base
  -- de la comparación a tres bandas y, en el envío, el padre que se exige: si
  -- la rama se movió por otro lado, el envío se rechaza y toca traer antes.
  last_synced_sha text,
  last_synced_at  timestamptz,
  created_by      uuid references auth.users on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (jsonb_typeof(path_map) = 'array' and jsonb_array_length(path_map) > 0)
);

create trigger project_repos_touch before update on project_repos
  for each row execute function touch_updated_at();

alter table project_repos enable row level security;

create policy "enlace: lo ven los miembros"
  on project_repos for select to authenticated using (is_member(project_id));
create policy "enlace: lo gestiona el dueño"
  on project_repos for all to authenticated
  using (is_member(project_id, 'owner')) with check (is_member(project_id, 'owner'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Base de la comparación: qué blob tenía cada archivo al sincronizar
-- ─────────────────────────────────────────────────────────────────────────────

-- Sin esto solo se sabe si dos versiones difieren, no *quién* cambió. Con el
-- blob de la última sincronización se distinguen los tres casos que importan:
-- cambió solo aquí (hay que subir), cambió solo allí (hay que bajar) o cambió
-- en los dos sitios (conflicto, no se toca nada).
--
-- La ruta es la del proyecto, no la del repo: es la que sigue siendo válida si
-- mañana se reapunta el enlace a otra carpeta.
create table project_repo_files (
  project_id uuid not null references projects on delete cascade,
  path       text not null,
  blob_sha   text not null,
  -- Hash del contenido tal y como salió del proyecto. GitHub calcula el blob
  -- sobre el archivo entero, así que basta con guardar el suyo; este campo es
  -- para los binarios, que no se rehashean en cada comparación.
  size_bytes int not null default 0,
  synced_at  timestamptz not null default now(),
  primary key (project_id, path)
);

alter table project_repo_files enable row level security;

create policy "base de sincronización: la ven los miembros"
  on project_repo_files for select to authenticated using (is_member(project_id));
create policy "base de sincronización: la gestiona el dueño"
  on project_repo_files for all to authenticated
  using (is_member(project_id, 'owner')) with check (is_member(project_id, 'owner'));

-- La interfaz escucha el enlace para pintar «sincronizado hace un momento» sin
-- recargar; los archivos ya se escuchaban desde 001.
alter publication supabase_realtime add table project_repos;
