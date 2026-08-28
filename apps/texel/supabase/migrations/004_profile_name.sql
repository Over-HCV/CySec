-- 004_profile_name.sql
--
-- `display_name` podía quedar en blanco, y en blanco se queda para siempre:
-- nada en la aplicación escribía nunca en `profiles`. Efecto visible: en el
-- diálogo Compartir el colaborador aparecía como una fila sin nombre, y en la
-- barra de presencia como un círculo sin iniciales.
--
-- El fallo está en el `coalesce` de `handle_new_user`: solo salta los NULL, así
-- que una cuenta creada con `full_name` presente pero vacío guardaba esa cadena
-- vacía en vez de caer al correo. La columna es `not null` pero no tenía `check`
-- de longitud, al contrario que `projects.name`.

-- 1. Que no vuelva a entrar ninguno vacío.
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
    -- `nullif(trim(...), '')` para que el vacío cuente como ausente y el
    -- `coalesce` siga hasta el correo.
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Usuario'
    ),
    new.email,
    palette[1 + (hashtext(new.id::text) % array_length(palette, 1) + array_length(palette, 1)) % array_length(palette, 1)]
  );
  return new;
end;
$$;

-- 2. Reparar lo que ya está guardado. Va antes del `check`: con filas que lo
--    incumplen, `add constraint` falla y la migración entera se queda a medias.
update profiles
   set display_name = coalesce(nullif(split_part(email, '@', 1), ''), 'Usuario')
 where trim(display_name) = '';

-- 3. Y cerrar la puerta, como ya hace `projects.name`.
alter table profiles
  add constraint profiles_display_name_not_blank
  check (length(trim(display_name)) > 0);
