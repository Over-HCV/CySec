-- 003_members_profile_fk.sql
--
-- `project_members.user_id` apuntaba solo a auth.users, así que PostgREST no
-- sabía unir miembros con perfiles y `select=*,profile:profiles(*)` fallaba con
-- PGRST200. Efecto visible: la lista de miembros salía vacía y, como la consulta
-- lanzaba error, el rol propio quedaba sin resolver y la interfaz marcaba
-- «solo lectura» incluso al dueño.
--
-- profiles.id ya referencia auth.users, así que esta segunda clave ajena no
-- cambia la semántica: solo la hace explícita para el planificador y para
-- PostgREST.

alter table project_members
  add constraint project_members_user_id_profiles_fkey
  foreign key (user_id) references profiles (id) on delete cascade;

alter table project_invites
  add constraint project_invites_created_by_profiles_fkey
  foreign key (created_by) references profiles (id) on delete cascade;

alter table compilations
  add constraint compilations_created_by_profiles_fkey
  foreign key (created_by) references profiles (id) on delete set null;
