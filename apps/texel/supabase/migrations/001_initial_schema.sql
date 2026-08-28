-- 001_initial_schema.sql — Texel: editor LaTeX colaborativo
--
-- Modelo: un proyecto tiene archivos; los archivos tienen un documento Yjs
-- (snapshot + updates incrementales); los miembros acceden por rol.
-- Todo el control de acceso es RLS sobre la pertenencia al proyecto.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Tipos
-- ─────────────────────────────────────────────────────────────────────────────

create type project_role as enum ('viewer', 'editor', 'owner');
create type file_kind    as enum ('text', 'binary');
create type tex_engine   as enum ('xelatex', 'pdflatex', 'lualatex');
create type compile_status as enum ('queued', 'running', 'success', 'error');

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles — espejo de auth.users con lo que necesita la UI
-- ─────────────────────────────────────────────────────────────────────────────

create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null,
  email        text,
  -- color del cursor en la edición colaborativa (awareness de Yjs)
  color        text not null default '#1F4E79',
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

-- Cualquier usuario autenticado puede ver perfiles: hacen falta para pintar los
-- cursores y la lista de miembros. Solo el dueño edita el suyo.
create policy "profiles: lectura autenticada"
  on profiles for select to authenticated using (true);
create policy "profiles: edición propia"
  on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Alta automática al registrarse.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  palette text[] := array['#1F4E79','#8B2500','#1B7A3D','#6A1B9A','#B8860B','#00695C'];
begin
  insert into public.profiles (id, display_name, email, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    palette[1 + (hashtext(new.id::text) % array_length(palette, 1) + array_length(palette, 1)) % array_length(palette, 1)]
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- projects / miembros / invitaciones
-- ─────────────────────────────────────────────────────────────────────────────

create table projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 120),
  owner_id   uuid not null references auth.users on delete cascade,
  root_file  text not null default 'main.tex',
  engine     tex_engine not null default 'xelatex',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_members (
  project_id uuid not null references projects on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  role       project_role not null default 'editor',
  added_by   uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index on project_members (user_id);

create table project_invites (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects on delete cascade,
  token       uuid not null unique default gen_random_uuid(),
  -- email null ⇒ enlace abierto: lo canjea quien lo tenga
  email       text,
  role        project_role not null default 'editor',
  created_by  uuid not null references auth.users on delete cascade,
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_by uuid references auth.users on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create index on project_invites (project_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Pertenencia: función security definer para no recursionar en las políticas
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function role_rank(r project_role)
returns int language sql immutable
as $$ select case r when 'viewer' then 1 when 'editor' then 2 when 'owner' then 3 end $$;

-- Sin security definer, "select de project_members dentro de una política de
-- project_members" se muerde la cola. Esta función rompe el ciclo.
create or replace function is_member(pid uuid, min_role project_role default 'viewer')
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from project_members m
    where m.project_id = pid
      and m.user_id = auth.uid()
      and role_rank(m.role) >= role_rank(min_role)
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- files
-- ─────────────────────────────────────────────────────────────────────────────

create table files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects on delete cascade,
  -- ruta relativa a la raíz del proyecto: 'main.tex', 'sections/01-intro.tex'
  path         text not null check (
                 path !~ '(^/|\.\.|^\s*$)' and length(path) <= 400
               ),
  kind         file_kind not null default 'text',
  -- text: contenido plano (lo que lee el compilador, volcado desde Yjs)
  content      text,
  -- binary: objeto en el bucket project-assets
  storage_path text,
  size_bytes   int not null default 0,
  updated_by   uuid references auth.users on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, path),
  check ((kind = 'text' and storage_path is null) or (kind = 'binary' and content is null))
);

create index on files (project_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Documentos Yjs: log de updates + snapshot compactado
-- ─────────────────────────────────────────────────────────────────────────────

-- `update` y `state` van en base64 sobre `text`, no en bytea: PostgREST obliga
-- a hexadecimal para bytea y eso complica al cliente (navegador) y a la Edge
-- Function (Deno) sin ganar nada. El coste es ~33 % de tamaño.
create table doc_updates (
  seq        bigserial primary key,
  file_id    uuid not null references files on delete cascade,
  update     text not null,
  client_id  text not null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index on doc_updates (file_id, seq);

create table doc_snapshots (
  file_id    uuid primary key references files on delete cascade,
  state      text not null,           -- base64 de Y.encodeStateAsUpdate(doc)
  -- hasta qué seq de doc_updates está incorporado este snapshot
  through_seq bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- compilations
-- ─────────────────────────────────────────────────────────────────────────────

create table compilations (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects on delete cascade,
  status       compile_status not null default 'queued',
  engine       tex_engine not null,
  root_file    text not null,
  log          text,
  -- diagnósticos parseados del log: [{file, line, level, message}]
  diagnostics  jsonb not null default '[]'::jsonb,
  pdf_path     text,
  synctex_path text,
  duration_ms  int,
  created_by   uuid references auth.users on delete set null,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create index on compilations (project_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at automático
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_touch before update on projects
  for each row execute function touch_updated_at();
create trigger files_touch before update on files
  for each row execute function touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table projects        enable row level security;
alter table project_members enable row level security;
alter table project_invites enable row level security;
alter table files           enable row level security;
alter table doc_updates     enable row level security;
alter table doc_snapshots   enable row level security;
alter table compilations    enable row level security;

-- projects
create policy "projects: ven los miembros"
  on projects for select to authenticated using (is_member(id));
create policy "projects: crea cualquiera como dueño"
  on projects for insert to authenticated with check (owner_id = auth.uid());
create policy "projects: edita el dueño"
  on projects for update to authenticated
  using (is_member(id, 'owner')) with check (is_member(id, 'owner'));
create policy "projects: borra el dueño"
  on projects for delete to authenticated using (owner_id = auth.uid());

-- project_members
create policy "miembros: los ve el equipo"
  on project_members for select to authenticated using (is_member(project_id));
create policy "miembros: los gestiona el dueño"
  on project_members for all to authenticated
  using (is_member(project_id, 'owner')) with check (is_member(project_id, 'owner'));

-- El dueño se inserta a sí mismo al crear el proyecto (aún no es miembro, así
-- que is_member() sería falso): esta política cubre ese caso concreto.
create policy "miembros: alta inicial del dueño"
  on project_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- project_invites: solo el dueño las ve y crea. El canje va por RPC.
create policy "invitaciones: las gestiona el dueño"
  on project_invites for all to authenticated
  using (is_member(project_id, 'owner')) with check (is_member(project_id, 'owner'));

-- files
create policy "archivos: los leen los miembros"
  on files for select to authenticated using (is_member(project_id));
create policy "archivos: los escriben editores"
  on files for all to authenticated
  using (is_member(project_id, 'editor')) with check (is_member(project_id, 'editor'));

-- doc_updates / doc_snapshots (el project_id se alcanza vía files)
create policy "yjs updates: lectura de miembros"
  on doc_updates for select to authenticated
  using (exists (select 1 from files f where f.id = file_id and is_member(f.project_id)));
create policy "yjs updates: escritura de editores"
  on doc_updates for insert to authenticated
  with check (exists (select 1 from files f where f.id = file_id and is_member(f.project_id, 'editor')));

create policy "yjs snapshots: lectura de miembros"
  on doc_snapshots for select to authenticated
  using (exists (select 1 from files f where f.id = file_id and is_member(f.project_id)));
create policy "yjs snapshots: escritura de editores"
  on doc_snapshots for all to authenticated
  using (exists (select 1 from files f where f.id = file_id and is_member(f.project_id, 'editor')))
  with check (exists (select 1 from files f where f.id = file_id and is_member(f.project_id, 'editor')));

-- compilations: las lee el equipo; las crea el compilador con service-role
-- (que salta RLS), pero también un editor desde el cliente.
create policy "compilaciones: lectura de miembros"
  on compilations for select to authenticated using (is_member(project_id));
create policy "compilaciones: las lanza un editor"
  on compilations for insert to authenticated
  with check (is_member(project_id, 'editor') and created_by = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: crear proyecto (proyecto + membresía + main.tex en una transacción)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function create_project(p_name text, p_engine tex_engine default 'xelatex')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'no autenticado';
  end if;

  insert into projects (name, owner_id, engine) values (p_name, auth.uid(), p_engine)
  returning id into v_id;

  insert into project_members (project_id, user_id, role, added_by)
  values (v_id, auth.uid(), 'owner', auth.uid());

  insert into files (project_id, path, kind, content, updated_by)
  values (v_id, 'main.tex', 'text',
          E'\\documentclass{article}\n\n\\begin{document}\n\nHola, ' || p_name || E'.\n\n\\end{document}\n',
          auth.uid());

  return v_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: canjear invitación
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function accept_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite project_invites%rowtype;
  v_email  text;
begin
  if auth.uid() is null then
    raise exception 'no autenticado';
  end if;

  select * into v_invite from project_invites where token = p_token;
  if not found then
    raise exception 'invitación inexistente';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invitación caducada';
  end if;
  if v_invite.accepted_by is not null then
    raise exception 'invitación ya usada';
  end if;

  -- Si la invitación va dirigida a un correo, solo la canjea ese correo.
  select email into v_email from auth.users where id = auth.uid();
  if v_invite.email is not null and lower(v_invite.email) <> lower(v_email) then
    raise exception 'esta invitación es para otro correo';
  end if;

  insert into project_members (project_id, user_id, role, added_by)
  values (v_invite.project_id, auth.uid(), v_invite.role, v_invite.created_by)
  on conflict (project_id, user_id) do nothing;

  update project_invites
     set accepted_by = auth.uid(), accepted_at = now()
   where id = v_invite.id;

  return v_invite.project_id;
end;
$$;

-- Vista previa de la invitación antes de aceptarla (nombre del proyecto y rol),
-- sin exponer la tabla entera.
create or replace function invite_preview(p_token uuid)
returns table (project_name text, role project_role, expired boolean, used boolean)
language sql
security definer
stable
set search_path = public
as $$
  select p.name, i.role, i.expires_at < now(), i.accepted_by is not null
  from project_invites i join projects p on p.id = i.project_id
  where i.token = p_token;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime: la UI escucha compilaciones y cambios del árbol de archivos.
-- (La edición colaborativa NO pasa por aquí: usa broadcast, ver M3.)
-- ─────────────────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table compilations;
alter publication supabase_realtime add table files;
alter publication supabase_realtime add table project_members;
