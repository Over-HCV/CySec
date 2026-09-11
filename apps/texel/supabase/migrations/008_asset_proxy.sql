-- 008_asset_proxy.sql — derivadas ligeras de las imágenes.
--
-- Motivo: xdvipdfmx no puede copiar el stream de un PNG que trae perfil ICC o
-- canal alfa; lo descomprime con libpng y lo vuelve a deflatear en CADA pasada.
-- Con 38 capturas de 3024×1964 eso son ~25 s de cada compilación, y el PDF sale
-- a 12,8 MB que hay que subir y volver a bajar. Las capturas se ven igual a
-- 1400 px, así que se guarda una derivada y se compila con ella mientras se
-- escribe; el original sigue donde estaba y es lo que usa 'full'.
--
--   proxy_path   objeto en `project-assets`, bajo `{project_id}/.proxy/…`. El
--                primer segmento sigue siendo el project_id: las políticas de
--                002_storage.sql valen tal cual. NULL = no hay derivada y se
--                compila con el original (proyectos anteriores a esto).
--   proxy_bytes  tamaño de la derivada; entra en la huella de las fuentes, igual
--                que `size_bytes` para el original.

alter table files
  add column if not exists proxy_path  text,
  add column if not exists proxy_bytes int;

-- Desglose del tiempo de una compilación (sync, latexmk, subida, caché). Sin
-- esto, «tarda mucho» no se puede repartir entre las etapas.
alter table compilations
  add column if not exists timings jsonb;
