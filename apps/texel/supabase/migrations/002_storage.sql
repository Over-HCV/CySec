-- 002_storage.sql — buckets privados y sus políticas.
--
-- project-assets/{project_id}/…   imágenes, PDFs y demás binarios del proyecto
-- compiled/{project_id}/{compile_id}/main.pdf|main.synctex.gz
--
-- Ambos privados: la UI pide URLs firmadas. El compilador escribe con la
-- service-role key, que salta RLS.

insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', false),
       ('compiled', 'compiled', false)
on conflict (id) do nothing;

-- El primer segmento de la ruta es el project_id: eso es lo que se comprueba.
create policy "assets: lectura de miembros"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-assets'
    and is_member((storage.foldername(name))[1]::uuid)
  );

create policy "assets: escritura de editores"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-assets'
    and is_member((storage.foldername(name))[1]::uuid, 'editor')
  );

create policy "assets: borrado de editores"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-assets'
    and is_member((storage.foldername(name))[1]::uuid, 'editor')
  );

-- Las salidas compiladas son de solo lectura para el cliente; las sube el
-- servicio de compilación.
create policy "compilados: lectura de miembros"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'compiled'
    and is_member((storage.foldername(name))[1]::uuid)
  );
