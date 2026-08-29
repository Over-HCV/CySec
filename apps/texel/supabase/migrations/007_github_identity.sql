-- 006_github_identity.sql — quién es cada quien en GitHub, y a qué instalación
-- tiene acceso de verdad.
--
-- En 005 una instalación pertenecía a quien tuviera la sesión abierta cuando
-- GitHub redirigía de vuelta. Eso tiene dos problemas: nadie más podía verla
-- —aunque tuviera el mismo acceso en GitHub— y nada demostraba que quien la
-- registró tuviera derecho a ella.
--
-- Ahora la prueba la da el propio GitHub: al iniciar sesión con GitHub se
-- pregunta por `GET /user/installations`, y solo lo que ahí aparece se apunta
-- en la tabla puente. El token de esa consulta no se guarda: se usa dentro de
-- la ruta de vuelta y se tira.

create table github_identities (
  user_id    uuid primary key references auth.users on delete cascade,
  login      text not null,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table github_identities enable row level security;

create policy "identidad de github: cada quien la suya"
  on github_identities for select to authenticated using (user_id = auth.uid());

-- Quién puede usar qué instalación. Varias personas pueden compartir una: es lo
-- que permite que dos miembros del curso enlacen proyectos contra el mismo
-- repositorio sin instalar la App dos veces.
create table github_installation_users (
  installation_id bigint not null references github_installations on delete cascade,
  user_id         uuid not null references auth.users on delete cascade,
  claimed_at      timestamptz not null default now(),
  primary key (installation_id, user_id)
);

create index on github_installation_users (user_id);

alter table github_installation_users enable row level security;

create policy "acceso a instalación: cada quien el suyo"
  on github_installation_users for select to authenticated using (user_id = auth.uid());

-- Lo que ya existía sigue valiendo: quien registró una instalación con el flujo
-- viejo la conserva.
insert into github_installation_users (installation_id, user_id)
select id, user_id from github_installations
on conflict do nothing;

-- `user_id` pasa a ser «quien la registró primero», solo informativo: el acceso
-- lo decide la tabla puente. Puede faltar si la fila nace del Setup URL sin
-- sesión de GitHub por medio.
alter table github_installations alter column user_id drop not null;

comment on column github_installations.user_id is
  'quien la registró primero; el acceso lo decide github_installation_users';
