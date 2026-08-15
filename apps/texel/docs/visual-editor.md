# Plan — Modo visual por bloques para Texel

> **Cómo usar este documento**: es el plan de trabajo vivo. Ve marcando las
> casillas de cada hito a medida que se completen y añade debajo de cada uno lo
> que haya salido distinto de lo previsto. Los hitos están ordenados: M1 y M2
> (parseo con ida y vuelta demostrable) son la red de seguridad de todo lo
> demás, así que no se empieza la interfaz sin ellos.
>
> Estado: **sin empezar**. Última revisión: 15 de agosto de 2026.

## Contexto

Texel ya funciona: editor de código colaborativo (CodeMirror + Yjs sobre Supabase
Realtime), compilación en Cloud Run y visor de PDF con SyncTeX. El problema es
quién escribe: los compañeros de curso **no saben LaTeX**, y hoy la única forma
de aportar es teclear macros.

La solución pedida: el panel del editor pasa a tener **dos pestañas — Código y
Visual**. En la visual, el documento se ve como bloques tipo Notion/Scratch: una
entrada `.bib` es un bloque con sus campos, un `\porque{título}{texto}` es un
bloque con dos campos, un caso es un bloque con título y cuerpo. Se añaden
bloques con `/` (autocompletado, Tab/Enter inserta) y cada bloque tiene sus
acciones (borrar, duplicar, mover). **El bloque es solo una representación del
LaTeX**: tocar el bloque cambia el código y tocar el código cambia el bloque.

Decisiones ya tomadas con el usuario:
- **Alcance v1**: entradas `.bib` + macros de `cysec.cls` + párrafos con marcas
  (negrita, cursiva, código). Todo lo demás se preserva en un bloque «LaTeX
  crudo».
- **Motor propio** sobre el `Y.Text` existente. Nada de TipTap/ProseMirror/
  BlockNote: meterían un segundo CRDT del mismo archivo.
- Este documento vive en `apps/texel/docs/visual-editor.md`.

## Principios que no se negocian

1. **El texto del archivo es la única fuente de verdad.** Los bloques son una
   proyección del `Y.Text` `'content'` (ver `web/app/features/editor/lib/supabase-yjs-provider.ts:147`).
   No hay estado paralelo que pueda divergir.
2. **Nada se pierde.** Lo que el parser no entienda se convierte en un bloque
   «LaTeX crudo» que conserva su texto exacto, incluidos comentarios y espacios.
3. **Parches mínimos.** Editar un campo reemplaza solo su rango en el texto, no
   reescribe el archivo: así dos personas pueden trabajar en bloques distintos a
   la vez sin pisarse.
4. **Ida y vuelta demostrable.** `serializar(parsear(x)) === x` sobre los
   archivos reales del repo, verificado con tests, antes de tocar la UI.

## Arquitectura

```
web/app/features/visual/
├── lib/
│   ├── types.ts          Block, BlockKind, Range, ParseResult
│   ├── parse-bib.ts      BibTeX → bloques (parser propio, ~200 líneas)
│   ├── parse-tex.ts      LaTeX → bloques (sobre unified-latex)
│   ├── serialize.ts      bloque → LaTeX/BibTeX
│   ├── catalog.ts        definición de cada tipo de bloque (campos, icono, plantilla)
│   └── doc-sync.ts       Y.Text ⇄ bloques (parches mínimos, reparseo)
├── composables/
│   └── useBlocks.ts      estado reactivo para la UI
└── components/
    ├── VisualEditor.vue  contenedor: lista de bloques + menú slash
    ├── BlockShell.vue    marco común: handle, acciones, foco
    ├── SlashMenu.vue     autocompletado con `/`
    └── blocks/*.vue      un componente por tipo
```

### Modelo

```ts
type BlockKind =
  | 'section' | 'paragraph' | 'caso' | 'fuentes' | 'pregunta' | 'respuesta'
  | 'mcq' | 'porque' | 'bibEntry' | 'raw'

interface Block {
  id: string                 // estable entre reparseos: hash(kind + rango + contenido)
  kind: BlockKind
  range: [from: number, to: number]   // offsets en el Y.Text
  fields: Record<string, string | string[] | boolean>
  children?: Block[]         // para entornos que contienen texto
  raw: string                // fuente exacta; lo que se reinyecta si algo falla
}
```

### Sincronía (`doc-sync.ts`)

- Al entrar en la pestaña visual: `parse(ytext.toString())` → bloques.
- Edición en un bloque → `serializeBlock(block)` → si cambió, una sola
  transacción Yjs: `ytext.delete(from, len)` + `ytext.insert(from, nuevo)` con
  `origin: 'visual'`.
- Cambios entrantes (`origin !== 'visual'`) → reparseo con *debounce* de 120 ms,
  conservando el foco por `id` de bloque y campo.
- Los rangos posteriores se desplazan con el delta del parche; si el reparseo
  detecta desajuste, se reparsea entero (barato: los archivos del curso rondan
  los 5-10 KB).

### Parseo

- **BibTeX**: parser propio. La gramática es pequeña (`@tipo{clave, campo = {…}}`)
  y así controlamos el formato de salida exacto. No merece la pena una
  dependencia.
- **LaTeX**: `@unified-latex/unified-latex-util-parse@1.8.4` (+ `-types`,
  `-arguments`, `-print-raw`). Da AST con posiciones y sabe imprimir de vuelta
  sin reformatear, que es justo lo que necesita el principio 4. Las macros
  propias se declaran con su firma (`\porque{}{}`, `\pregunta{}`, `\opcion*{}`)
  para que el parser separe bien los argumentos.

## Catálogo de bloques v1

| Bloque | LaTeX que representa | Campos en la UI |
|---|---|---|
| Sección | `\section{…}` / `\subsection{…}` | título, nivel |
| Párrafo | texto suelto con `\textbf`, `\emph`, `\texttt` | texto con marcas |
| Caso | `\begin{caso}{título} … \end{caso}` | título, cuerpo |
| Fuentes | `\begin{fuentes}\fuente{url}…\end{fuentes}` | lista de URLs |
| Pregunta | `\pregunta{…}` | enunciado |
| Respuesta | `\begin{respuesta} … \end{respuesta}` | cuerpo (vacío ⇒ avisa «pendiente») |
| Selección múltiple | `\begin{mcq}{enunciado}\opcion{…}\opcion*{…}\end{mcq}` | enunciado + opciones con marca de correcta |
| Nota de borrador | `\porque{título}{texto}` | título, texto |
| Entrada bibliográfica | `@book{clave, campo = {…}}` | tipo, clave, campos (añadir/quitar) |
| LaTeX crudo | cualquier otra cosa | editor de texto monoespaciado |

Las macros de referencia están en `latex/tex/common/boxes.tex` y
`latex/tex/common/macros.tex`; el catálogo debe salir de ahí, no de la memoria.

## Interacción

- **`/` en un bloque vacío** abre el menú: filtra al teclear, ↑↓ navega,
  Enter/Tab inserta, Esc cancela.
- **Acciones por bloque** (aparecen al pasar el ratón, en el handle izquierdo):
  arrastrar para reordenar, duplicar, borrar, convertir a otro tipo cuando tenga
  sentido, y «ver LaTeX» (popover con la fuente del bloque).
- **Texto normal sin bloque**: escribir directamente crea un bloque `paragraph`;
  al pegar varios párrafos se crean varios.
- Solo lectura (`canWrite === false`): bloques visibles, campos deshabilitados.

---

## Hitos

### M0 — Preparación
- [ ] Copiar este documento a `apps/texel/docs/visual-editor.md`.
- [ ] `pnpm add @unified-latex/unified-latex-util-parse @unified-latex/unified-latex-types @unified-latex/unified-latex-util-arguments @unified-latex/unified-latex-util-print-raw` en `apps/texel/web`.
- [ ] `pnpm add -D vitest @vitest/coverage-v8` y script `test` en `web/package.json`.
- [ ] Crear el esqueleto de carpetas de `features/visual/`.
- **Listo cuando**: `pnpm test` corre (sin tests aún) y `pnpm typecheck` sigue limpio.

### M1 — BibTeX: parseo y serialización
- [ ] `lib/types.ts` con `Block`, `BlockKind`, `ParseResult`.
- [ ] `lib/parse-bib.ts`: entradas, claves, campos, valores con llaves anidadas,
      comentarios y `@string`/`@preamble` como `raw`.
- [ ] `lib/serialize.ts`: impresión de entradas con el formato del repo
      (campos alineados, una por línea).
- [ ] Tests: ida y vuelta exacto sobre `latex/tex/bib/refs.bib` (12 entradas) y
      sobre casos límite (llaves anidadas, acentos, campos multilínea).
- **Listo cuando**: `serialize(parse(refs.bib)) === refs.bib` byte a byte.

### M2 — LaTeX: parseo con rangos y refugio para lo desconocido
- [ ] `lib/parse-tex.ts` con las firmas de las macros de `cysec.cls`.
- [ ] Cada nodo reconocido produce un bloque con su `range`; lo demás se agrupa
      en bloques `raw` contiguos.
- [ ] Tests de ida y vuelta sobre los cuatro `latex/workshops/ws-01/sections/*.tex`
      y sobre `main.tex` (que tiene preámbulo, `\input`s y bibliografía).
- **Listo cuando**: los cinco archivos vuelven idénticos y ningún bloque `raw`
  contiene una macro del catálogo.

### M3 — Sincronía con Yjs (sin UI todavía)
- [ ] `lib/doc-sync.ts`: `parseDoc`, `applyBlockEdit`, `insertBlock`,
      `removeBlock`, `moveBlock`, todos sobre `Y.Text` con `origin: 'visual'`.
- [ ] Reparseo con debounce ante cambios remotos; conservación de `id` de bloque.
- [ ] Test de concurrencia al estilo de `web/scripts/collab-smoke.ts`: dos
      documentos Yjs, uno edita por bloques y el otro por texto; deben converger.
- **Listo cuando**: el smoke test de concurrencia pasa y el editor de código
  refleja en vivo un `applyBlockEdit`.

### M4 — UI mínima
- [ ] Pestañas «Código | Visual» en la barra del panel del editor
      (`web/app/pages/p/[id].vue`), con la elección guardada en `usePanes`.
- [ ] `VisualEditor.vue` + `BlockShell.vue` + componentes de `bibEntry`, `caso`,
      `porque`, `pregunta`, `respuesta`, `raw`.
- [ ] Edición de campos → `applyBlockEdit` con *debounce* de 300 ms.
- [ ] Estado de solo lectura y aviso cuando el archivo no es `.tex` ni `.bib`.
- **Listo cuando**: abrir `bib/refs.bib` en visual, cambiar un año, volver a
  código y ver el cambio; compilar y ver el PDF actualizado.

### M5 — Menú `/` y acciones de bloque
- [ ] `SlashMenu.vue` con filtrado, teclado completo y plantillas del catálogo.
- [ ] Handle con arrastrar-soltar (reordenar mueve el rango en el texto).
- [ ] Duplicar, borrar, convertir, «ver LaTeX».
- **Listo cuando**: se puede montar una sección nueva (caso + fuentes + 3
  preguntas) sin escribir una sola macro.

### M6 — Párrafos con marcas y citas
- [ ] Bloque `paragraph` con negrita/cursiva/código (`⌘B`, `⌘I`) mapeadas a
      `\textbf`, `\emph`, `\texttt`.
- [ ] Chip de cita: `\cite{clave}` con selector que lee las entradas del `.bib`
      del proyecto.
- [ ] Pegar texto plano crea párrafos; pegar LaTeX crea un bloque `raw`.
- **Listo cuando**: un párrafo con las tres marcas y una cita vuelve idéntico
  tras un ida y vuelta.

### M7 — Pulido
- [ ] Presencia: mostrar en qué bloque está cada colaborador (reusa el awareness
      del proveedor).
- [ ] Rendimiento con un archivo de ~200 KB (reparseo incremental si hace falta).
- [ ] Accesibilidad: foco visible, navegación con teclado, `aria` en el menú.
- [ ] Documentar el catálogo en `apps/texel/docs/visual-editor.md` y enlazarlo
      desde `apps/texel/README.md`.

---

## Verificación

1. **Unitaria**: `pnpm test` en `web/` — ida y vuelta sobre los archivos reales
   del repo (`latex/tex/bib/refs.bib`, `latex/workshops/ws-01/**`). Es la red de
   seguridad del principio 4; si esto pasa, no se corrompen documentos.
2. **Concurrencia**: script tipo `web/scripts/collab-smoke.ts` con dos clientes,
   uno en visual y otro en código sobre el mismo archivo.
3. **Manual, en el navegador** (Supabase local + compilador en Docker, ver
   `apps/texel/README.md`):
   - abrir `main.tex` → pestaña Visual → los bloques coinciden con el documento;
   - `/` → «Nota de borrador» → rellenar → pestaña Código → la macro está bien
     escrita;
   - **Compilar** → el PDF cambia como se espera;
   - segunda ventana en incógnito con el mismo proyecto: editar en código y ver
     cómo se actualiza el bloque en la primera.
4. **No regresión**: el modo código, los cursores remotos, SyncTeX y el panel de
   problemas siguen funcionando igual.

## Riesgos y cómo se han cerrado

| Riesgo | Decisión |
|---|---|
| Reescribir el archivo y perder formato o comentarios | Parches mínimos por rango + bloques `raw` que conservan la fuente literal |
| Dos representaciones vivas en conflicto | Un solo CRDT: los bloques se derivan del `Y.Text`, nunca al revés |
| Macros que el parser no entiende | Bloque `raw` editable; el catálogo crece cuando haga falta |
| Alguien edita en código mientras otro edita en visual | Reparseo con debounce y conservación de foco; test de convergencia en M3 |
| Documentos grandes | Reparseo completo hasta ~200 KB; incremental solo si M7 lo justifica |

## Fuera del alcance de la v1

Tablas, TikZ, matemáticas WYSIWYG, subida de imágenes, edición del preámbulo por
formulario. Todo eso vive en bloques `raw` y se abordará cuando el núcleo esté
asentado.
