-- 006_compile_cache.sql — compilación incremental.
--
-- Dos columnas nuevas en `compilations`, las dos aditivas y anulables: las
-- filas de antes se quedan con NULL y nunca se reutilizan, que es lo correcto
-- (no sabemos de qué versión del proyecto salieron).
--
--   source_hash  huella de (archivo raíz, motor, rutas + contenidos). Si dos
--                compilaciones la comparten, el PDF tiene que ser el mismo, así
--                que el compilador devuelve la anterior en vez de repetirla.
--                Es lo que evita rehacer el documento entero cada vez que la
--                compilación automática se dispara sin cambios reales.
--   mode         con qué profundidad se hizo. Un resultado 'fast' no vale para
--                una petición 'normal' (va sin bibliografía), pero al revés sí.

alter table compilations
  add column if not exists source_hash text,
  add column if not exists mode        text;

-- La consulta del compilador: última compilación con PDF de esta misma versión.
create index if not exists compilations_source_hash_idx
  on compilations (project_id, source_hash, created_at desc)
  where source_hash is not null;
