# Plan — Modo visual por bloques para Texel

> **Cómo usar este documento**: es el plan de trabajo vivo. Ve marcando las
> casillas de cada hito a medida que se completen y añade debajo de cada uno lo
> que haya salido distinto de lo previsto. Los hitos están ordenados: M1 y M2
> (parseo con ida y vuelta demostrable) son la red de seguridad de todo lo
> demás, así que no se empieza la interfaz sin ellos.
>
> Estado: **M0–M4 hechos**. Última revisión: 15 de agosto de 2026.

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
- **Parser propio también para el `.tex`**, no `@unified-latex`. Ver «Parseo».

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
   En la práctica salió más fuerte de lo previsto: los bloques *particionan* el
   texto, así que la ida y vuelta es una identidad por construcción y el test
   solo la vigila (`blocks.map(slice).join('') === text`).

## Arquitectura

```
web/app/features/visual/
├── lib/
│   ├── types.ts          Span, Field, Block, BlockKind, DocKind
│   ├── scan.ts           primitivas: readGroup, rawBlocks, fillGaps
│   ├── parse-bib.ts      BibTeX → bloques
│   ├── parse-tex.ts      LaTeX  → bloques
│   ├── catalog.ts        definición de cada tipo de bloque (campos, icono, plantilla)
│   └── doc-sync.ts       Y.Text ⇄ bloques (parches por rango, origin 'visual')
├── composables/
│   └── useBlocks.ts      estado reactivo para la UI
└── components/
    ├── VisualEditor.vue  contenedor: lista de bloques + añadir
    ├── BlockShell.vue    marco común: etiqueta, acciones, «ver LaTeX»
    ├── BlockField.vue    campo con borrador local mientras tiene el foco
    └── Block*.vue        BibEntry, Fuentes, Mcq, Respuesta, Raw, Generic
```

No hay `serialize.ts`: un bloque intacto **es** su substring del documento, así
que no hay nada que serializar. Solo se escribe el rango del campo editado.

Tampoco hay un componente por tipo: los que solo son «etiqueta + campos»
(sección, caso, pregunta, nota de borrador, `\input`) comparten `BlockGeneric`,
que lee sus campos del catálogo. Tienen componente propio los que hacen algo
más: lista de hijos (`Fuentes`, `Mcq`), estado semántico (`Respuesta`), campos
variables (`BibEntry`) o texto plano (`Raw`).

### Modelo

```ts
type BlockKind =
  | 'section' | 'caso' | 'fuentes' | 'fuente' | 'pregunta' | 'respuesta'
  | 'mcq' | 'opcion' | 'porque' | 'input' | 'bibEntry' | 'raw'

interface Span { from: number, to: number }          // offsets en el Y.Text
interface Field { name: string, span: Span, value: string }   // span del VALOR

interface Block {
  id: string
  kind: BlockKind
  span: Span
  fields: Field[]
  items?: Block[]            // hijos de fuentes y mcq
  flags?: Record<string, boolean>       // \opcion* → correcta; \section* → starred
  meta?: Record<string, number | string> // nivel de sección
}
```

Diferencias con el diseño original, aprendidas al implementarlo:

- **No hay `raw: string` en el bloque.** Sería una copia del documento que puede
  quedarse vieja. El texto se saca siempre con `text.slice(span)`.
- **Cada campo lleva su propio rango**, no solo el bloque. Es lo que permite que
  editar un campo no reescriba el bloque entero.
- **El `id` no intenta sobrevivir al reparseo.** El hash de contenido que
  proponía el plan cambia con cada pulsación, así que no servía para conservar
  el foco. En su lugar, cada campo guarda su borrador local mientras lo estás
  escribiendo y no se repinta hasta que lo sueltas (`BlockField.vue`). El `id`
  (`kind#ordinal`) es solo la `:key` de la lista.

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

Escáner propio para los dos formatos, **sin `@unified-latex`**. La decisión
cambió durante la implementación, por tres razones:

1. La superficie real es diminuta. `cysec.cls` y `common/{boxes,macros}.tex` no
   usan xparse: hay **un** comando estrellado (`\opcion*`) y **un** argumento
   opcional (`\todoans[]`). Las fuentes del curso suman ~26 KB.
2. unified-latex normaliza espacios y comentarios al imprimir, así que la ida y
   vuelta byte a byte habría que perseguirla caso por caso contra su printer.
3. **Es edición en tiempo real.** Un serializador que reimprime el documento
   pisaría lo que otra persona tiene a medio escribir en ese instante. El
   escáner por rangos solo toca el rango del campo editado.

- **BibTeX** (`parse-bib.ts`): `@tipo{clave, campo = valor, …}`, con valor entre
  llaves, entre comillas o desnudo. `@string`/`@preamble` y los banners de
  comentario quedan como `raw`. El `%` es literal (aparece en URLs).
- **LaTeX** (`parse-tex.ts`): una pasada anotando offsets, saltando comentarios.
  Entornos de contenido (`table`, `tabularx`, `verbatim`, …) se conservan
  enteros como `raw`; los desconocidos (`document`) no son barrera y se sigue
  escaneando dentro. Un entorno o argumento sin cerrar **no** se reconoce: se
  queda en `raw` en vez de inventarse un final.

## Catálogo de bloques v1

| Bloque | LaTeX que representa | Campos en la UI |
|---|---|---|
| Sección | `\section{…}` / `\subsection{…}`, con o sin `*` | título (nivel y estrella como etiqueta) |
| Caso | `\begin{caso}{título} … \end{caso}` | título, cuerpo |
| Fuentes | `\begin{fuentes}\fuente{url}…\end{fuentes}` | lista de URLs, añadir/quitar |
| Pregunta | `\pregunta{…}` | enunciado |
| Respuesta | `\begin{respuesta} … \end{respuesta}` | cuerpo (vacío ⇒ avisa «pendiente») |
| Selección múltiple | `\begin{mcq}{enunciado}\opcion{…}\opcion*{…}\end{mcq}` | enunciado + opciones con marca de correcta |
| Nota de borrador | `\porque{título}{texto}` | título, texto |
| Archivo incluido | `\input{ruta}` | ruta |
| Entrada bibliográfica | `@book{clave, campo = {…}}` | tipo, clave y los campos que tenga la entrada |
| LaTeX crudo | cualquier otra cosa | editor de texto monoespaciado |

Las macros de referencia están en `latex/tex/common/boxes.tex` y
`latex/tex/common/macros.tex`; el catálogo debe salir de ahí, no de la memoria.

El bloque «Párrafo» con marcas (`\textbf`, `\emph`, `\texttt`) es M6: hoy la
prosa suelta cae en bloques `raw`, uno por párrafo.

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
- [x] Copiar este documento a `apps/texel/docs/visual-editor.md`.
- [x] ~~`pnpm add @unified-latex/…`~~ — descartado, ver «Parseo». Cero
      dependencias nuevas de runtime.
- [x] `pnpm add -D vitest`, `vitest.config.ts` y script `test` en
      `web/package.json`. Sin `@vitest/coverage-v8`: `lib/` es el único código
      cubierto y la cobertura no aporta nada que no diga el propio test.
- [x] Crear el esqueleto de `features/visual/` y registrarlo en `nuxt.config.ts`.
- **Listo cuando**: `pnpm test` corre y `pnpm typecheck` sigue limpio. ✔

### M1 — BibTeX
- [x] `lib/types.ts` con `Span`, `Field`, `Block`, `BlockKind`, `DocKind`.
- [x] `lib/scan.ts` con `readGroup`, `rawBlocks`, `fillGaps`.
- [x] `lib/parse-bib.ts`: entradas, claves, campos, valores entre llaves,
      comillas o desnudos, y `@string`/`@preamble`/comentarios como `raw`.
- [x] ~~`lib/serialize.ts`~~ — innecesario: no hay nada que imprimir.
- [x] Tests sobre `latex/tex/bib/refs.bib` (12 entradas) y casos límite
      (llaves anidadas, acentos, multilínea, comillas, `%` en URL, entrada sin
      cerrar).
- **Listo cuando**: la partición cubre `refs.bib` byte a byte. ✔ Incluida la
  entrada `avast-forbes`, cuya alineación rota se conserva tal cual.

### M2 — LaTeX
- [x] `lib/parse-tex.ts` con las macros y entornos de `cysec.cls`.
- [x] Cada macro reconocida produce un bloque con su `span`; los huecos se
      rellenan con bloques `raw` partidos por línea en blanco.
- [x] Tests sobre los cuatro `latex/workshops/ws-01/sections/*.tex` y `main.tex`.
- **Listo cuando**: los cinco archivos quedan cubiertos por la partición y
  ningún bloque `raw` contiene una macro del catálogo. ✔

### M3 — Sincronía con Yjs
- [x] `lib/doc-sync.ts`: `parseDoc`, `applyFieldEdit`, `insertBlock`,
      `removeBlock`, `duplicateBlock`, `moveBlock`, `toggleOption`, todos sobre
      `Y.Text` con `origin: 'visual'`.
- [x] `checkValue`: se niega a escribir un valor con llaves descompensadas. Un
      `.tex` roto no lo es solo para quien escribe.
- [x] Reparseo inmediato para lo propio (los rangos posteriores se desplazan) y
      con debounce de 120 ms para lo ajeno.
- [x] ~~Conservación de `id` de bloque~~ — sustituida por borrador local en el
      campo con el foco, ver «Modelo».
- [x] Test de concurrencia sin red: dos `Y.Doc`, uno edita por bloques y el otro
      por texto; convergen y conservan ambos cambios.
- **Listo cuando**: los tests pasan y el editor de código refleja en vivo un
  `applyFieldEdit`. ✔

### M4 — UI mínima
- [x] Pestañas «Código | Visual» (`MacSegmentedControl`) en la barra del panel
      del editor (`web/app/pages/p/[id].vue`), con la elección en `usePanes`
      (`editorTab`). La pestaña solo aparece en `.tex` y `.bib`.
- [x] `VisualEditor.vue`, `BlockShell.vue`, `BlockField.vue` y los componentes
      de bloque.
- [x] Edición de campos → `applyFieldEdit` con *debounce* de 300 ms.
- [x] Estado de solo lectura: campos deshabilitados y sin acciones de bloque.
- **Listo cuando**: abrir `bib/refs.bib` en visual, cambiar un año, volver a
  código y ver el cambio; compilar y ver el PDF actualizado. ✔ Verificado en el
  navegador contra Supabase local, en los dos sentidos.

**Cómo conviven las dos pestañas**: `TexEditor` es dueño del `Y.Doc` y de la
conexión, y su `teardown()` invoca la Edge Function `flush-doc`. Desmontarlo al
cambiar de pestaña tiraría la conexión cada vez, así que se oculta con `v-show`
y comparte su proveedor con `VisualEditor` a través del emit `ready`, que ya
existía sin usar. Al volver a Código se llama a `remeasure()`, porque CodeMirror
mide mal desde `display: none`.

### M5 — Menú `/` y acciones de bloque
- [x] Duplicar, borrar, subir/bajar y «ver LaTeX» en `BlockShell`.
- [x] Añadir bloque desde un menú con las plantillas del catálogo.
- [ ] `SlashMenu.vue`: abrir con `/`, filtrar al teclear, teclado completo.
- [ ] Handle con arrastrar-soltar (hoy se reordena con las flechas).
- [ ] Convertir un bloque a otro tipo.
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

1. **Unitaria**: `pnpm test` en `web/` — 61 tests sobre los archivos reales del
   repo (`latex/tex/bib/refs.bib`, `latex/workshops/ws-01/**`). Es la red de
   seguridad del principio 4; si esto pasa, no se corrompen documentos.
2. **Concurrencia**: en `test/doc-sync.test.ts`, con dos `Y.Doc` en memoria —
   uno edita por bloques y el otro por texto. Sin red ni Supabase, así que corre
   en cada `pnpm test` en vez de a mano como `web/scripts/collab-smoke.ts`.
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
| Reescribir el archivo y perder formato o comentarios | Los bloques particionan el texto: uno intacto *es* su substring. Solo se escribe el rango del campo editado |
| Dos representaciones vivas en conflicto | Un solo CRDT: los bloques se derivan del `Y.Text`, nunca al revés |
| Macros que el parser no entiende | Bloque `raw` editable; el catálogo crece cuando haga falta |
| Alguien edita en código mientras otro edita en visual | Reparseo con debounce + borrador local en el campo con el foco; test de convergencia en M3 |
| Un valor con llaves descompensadas rompe el `.tex` para todos | `checkValue` lo rechaza antes de escribir y el bloque avisa en línea |
| Documentos grandes | Reparseo completo hasta ~200 KB; incremental solo si M7 lo justifica |

## Fuera del alcance de la v1

Tablas, TikZ, matemáticas WYSIWYG, subida de imágenes, edición del preámbulo por
formulario. Todo eso vive en bloques `raw` y se abordará cuando el núcleo esté
asentado.
