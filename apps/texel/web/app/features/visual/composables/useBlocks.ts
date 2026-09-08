/**
 * Estado reactivo de los bloques de un archivo.
 *
 * Reparsea el documento entero en cada cambio. Suena caro y no lo es: los
 * archivos del curso rondan los 2 KB y el escáner es una sola pasada. A cambio
 * no hay estado incremental que pueda desincronizarse del texto, que es el
 * único fallo del que no se vuelve.
 *
 * Toda acción vuelve a buscar su bloque en el árbol recién parseado antes de
 * escribir (`resolve`), y toda escritura comprueba que el documento siga
 * diciendo lo que el bloque cree (`STALE`). Entre lo que se pinta y lo que se
 * pulsa caben 300 ms del campo que se estaba escribiendo, 120 ms de un cambio
 * ajeno y un segundo clic; sin las dos cosas, esos huecos escriben en el sitio
 * equivocado y descolocan el archivo.
 *
 * El foco no se conserva por identidad de bloque: cada campo guarda su borrador
 * mientras lo estás escribiendo y no se repinta hasta que lo sueltas (ver
 * `BlockField.vue`).
 */
import type * as Y from 'yjs'
import {
  applyBodyEdit, applyFieldEdit, convertBlock, duplicateBlock, insertBlock, insertRow, insideOf,
  moveBlock, moveBlockTo, moveRow, parseDoc, removeBlock, removeRow, renameEnv, STALE,
  toggleOption, VISUAL_ORIGIN, type EditProblem
} from '../lib/doc-sync'
import { childKind } from '../lib/catalog'
import { blockAt, siblingsAt, type Block, type BlockKind, type DocKind, type Field } from '../lib/types'

/** Espera antes de repintar por un cambio ajeno, para no parpadear al teclear. */
const REMOTE_DEBOUNCE_MS = 120

/** Cuánto se enseña el aviso de «el documento cambió». */
const NOTICE_MS = 4000

export function useBlocks(ytext: Y.Text, kind: DocKind) {
  const text = shallowRef(ytext.toString())
  const blocks = shallowRef<Block[]>(parseDoc(text.value, kind))
  /** Último aviso de validación, por campo. */
  const problems = ref<Record<string, string>>({})
  /** Aviso pasajero cuando una acción llegó tarde. */
  const notice = ref<string | null>(null)
  /**
   * Bloques plegados, por `id`. Es estado de vista: no toca el documento y se
   * pierde al cerrar. El preámbulo empieza plegado porque es andamiaje, no
   * contenido.
   */
  const collapsed = ref(new Set<string>(
    blocks.value.filter(b => b.kind === 'preamble').map(b => b.id)
  ))

  /**
   * Dónde tiene que quedar el cursor, como offset absoluto del documento.
   *
   * Es la única forma de que el cursor sobreviva a un reparseo: los bloques se
   * vuelven a crear enteros en cada cambio, así que no hay componente al que
   * agarrarse — pero el documento sí sigue siendo el mismo texto, y una
   * posición en él la puede reclamar el campo que la contenga cuando se pinte.
   * Los offsets se anotan **después** de escribir, ya en las coordenadas nuevas.
   */
  const caret = ref<number | null>(null)

  /**
   * Estado del arrastrar-soltar. Vive aquí y no en el componente porque el
   * bloque que se arrastra y el que pinta la línea de destino son dos nodos
   * distintos del árbol, y entre ellos puede haber cinco niveles de anidamiento.
   */
  const dragging = ref<string | null>(null)
  const dropTarget = ref<{ id: string, edge: 'before' | 'after' } | null>(null)

  let timer: ReturnType<typeof setTimeout> | null = null
  let noticeTimer: ReturnType<typeof setTimeout> | null = null
  /**
   * Hay una acción que cambió la estructura y la interfaz aún no se ha
   * repintado. Las direcciones (`2.1.0`) todavía apuntan al árbol de antes, así
   * que un segundo clic se ignora hasta el siguiente pintado.
   */
  let restructuring = false

  function refresh() {
    if (timer) { clearTimeout(timer); timer = null }
    text.value = ytext.toString()
    blocks.value = parseDoc(text.value, kind)
  }

  function onChange(_event: unknown, transaction: { origin: unknown }) {
    // Lo nuestro se repinta ya: los rangos posteriores acaban de desplazarse y
    // seguir usándolos escribiría en el sitio equivocado.
    if (transaction.origin === VISUAL_ORIGIN) { refresh(); return }
    if (timer) return
    timer = setTimeout(() => { timer = null; refresh() }, REMOTE_DEBOUNCE_MS)
  }

  ytext.observe(onChange as never)
  onScopeDispose(() => {
    if (timer) clearTimeout(timer)
    if (noticeTimer) clearTimeout(noticeTimer)
    ytext.unobserve(onChange as never)
  })

  /** Texto exacto que ocupa un bloque; es lo que enseña «ver LaTeX». */
  function sourceOf(block: Block): string {
    return text.value.slice(block.span.from, block.span.to)
  }

  /** El mismo bloque, pero del parseo de ahora mismo. */
  function resolve(block: Block): Block | null {
    return blockAt(blocks.value, block.id)
  }

  function warn(message: string) {
    notice.value = message
    if (noticeTimer) clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => { notice.value = null }, NOTICE_MS)
  }

  /** Pide el cursor en un punto del documento; `null` lo retira. */
  function placeCaret(at: number | null) {
    caret.value = at
  }

  /** Deja constancia del aviso de un campo, o lo retira si ya se resolvió. */
  function report(key: string, problem: EditProblem) {
    if (problem === STALE) {
      refresh()
      warn('El documento cambió mientras tanto. Inténtalo otra vez.')
      return
    }
    if (problem) problems.value = { ...problems.value, [key]: problem }
    else if (problems.value[key]) {
      const next = { ...problems.value }
      delete next[key]
      problems.value = next
    }
  }

  /**
   * Ejecuta una acción que cambia la estructura del documento: se resuelve el
   * bloque contra el árbol de ahora y se bloquean las siguientes hasta repintar.
   */
  function structural(block: Block, fn: (fresh: Block) => EditProblem) {
    if (restructuring) return
    const fresh = resolve(block)
    if (!fresh) { refresh(); warn('El bloque ya no está donde estaba.'); return }

    const problem = fn(fresh)
    if (problem === STALE) {
      refresh()
      warn('El documento cambió mientras tanto. Inténtalo otra vez.')
      return
    }
    restructuring = true
    void nextTick(() => { restructuring = false })
  }

  function edit(block: Block, field: Field, value: string) {
    // El campo se busca en el árbol de ahora: entre que se tecleó y que se
    // guarda (300 ms) el documento ha podido moverse por debajo.
    const fresh = resolve(block)
    // Si el bloque sigue ahí pero ya no tiene ese campo, es que dejó de ser lo
    // que era. Escribir con el rango de antes es exactamente lo que descoloca
    // el archivo, así que se trata como llegar tarde.
    const target = fresh
      ? fresh.fields.find(f => f.name === field.name) ?? null
      : field
    const key = `${block.id}:${field.name}`
    if (!target) { report(key, STALE); return }
    report(key, applyFieldEdit(ytext, target, value))
  }

  /**
   * Parte un campo de prosa en dos párrafos por donde esté el cursor: es lo que
   * hace la tecla Enter.
   *
   * En LaTeX un párrafo nuevo es una línea en blanco, así que se escribe el
   * campo entero con un `\n\n` en medio y el cursor se queda al principio de lo
   * que quedó detrás — que tras el reparseo ya es un bloque aparte.
   */
  function split(block: Block, field: Field, before: string, after: string) {
    const fresh = resolve(block)
    const target = fresh?.fields.find(f => f.name === field.name) ?? null
    const key = `${block.id}:${field.name}`
    if (!target) { report(key, STALE); return }

    const problem = applyFieldEdit(ytext, target, `${before}\n\n${after}`)
    report(key, problem)
    if (problem) return

    // `refresh()` ya ha corrido (la transacción es nuestra), así que `text`
    // dice lo de ahora. El párrafo de abajo empieza donde empiece su texto: si
    // el corte dejó un espacio delante, ese espacio no es de nadie y el campo
    // no lo abarca — dejar ahí el cursor sería dejarlo fuera de todo campo.
    placeCaret(writable(target.span.from + before.length + 2))
  }

  /** El primer sitio a partir de `at` donde de verdad se puede escribir. */
  function writable(at: number): number {
    let i = at
    while (i < text.value.length && (text.value[i] === ' ' || text.value[i] === '\t')) i++
    return i
  }

  /**
   * Cambia el lenguaje de un bloque de código.
   *
   * Tres casos, porque el `[language=…]` puede no existir todavía: si hay campo
   * se reescribe su valor —cinco caracteres—; si no lo hay se escribe la opción
   * entera detrás del `\begin{…}`, con el bloque de guarda porque ahí el rango
   * propio está vacío y no comprueba nada; y quitarlo solo se puede cuando el
   * corchete no lleva nada más, o se llevaría por delante opciones que la
   * interfaz ni enseña.
   */
  function setLanguage(block: Block, value: string) {
    const fresh = resolve(block)
    if (!fresh) { refresh(); return }
    const key = `${block.id}:lenguaje`
    const field = fresh.fields.find(f => f.name === 'lenguaje') ?? null
    const { optFrom, optTo, bodyFrom } = fresh.meta ?? {}

    if (value) {
      if (field) { report(key, applyFieldEdit(ytext, field, value)); return }
      if (bodyFrom === undefined) return
      report(key, applyFieldEdit(
        ytext,
        { name: 'lenguaje', span: { from: bodyFrom, to: bodyFrom }, value: '' },
        `[language=${value}]`,
        { span: fresh.span, expected: sourceOf(fresh) }
      ))
      return
    }

    if (!field || optFrom === undefined || optTo === undefined) return
    const opciones = text.value.slice(optFrom + 1, optTo - 1).trim()
    if (opciones !== `language=${field.value}`) {
      report(key, 'Este listing lleva más opciones; quítalas en la pestaña Código')
      return
    }
    report(key, applyFieldEdit(ytext, {
      name: 'opciones',
      span: { from: optFrom, to: optTo },
      value: text.value.slice(optFrom, optTo)
    }, ''))
  }

  function editBody(block: Block, value: string) {
    const fresh = resolve(block)
    if (!fresh) return
    report(`${block.id}:cuerpo`, applyBodyEdit(ytext, fresh, value, text.value))
  }

  function rename(block: Block, name: string) {
    const fresh = resolve(block)
    if (!fresh) return
    report(`${block.id}:env`, renameEnv(ytext, fresh, name))
  }

  function toggleCollapse(id: string) {
    const next = new Set(collapsed.value)
    if (!next.delete(id)) next.add(id)
    collapsed.value = next
  }

  /**
   * Escribe texto al final de un contenedor: es lo que hace la línea en blanco
   * que cierra cada bloque con hijos.
   *
   * Se inserta con sus saltos de línea propios para que al reparsear salga un
   * párrafo de verdad y no se pegue al bloque anterior.
   */
  function writeInside(container: Block, value: string) {
    const fresh = resolve(container)
    if (!fresh) { refresh(); return }
    const at = insideOf(fresh)
    if (at === null) return

    const prefix = text.value.slice(0, at).endsWith('\n') ? '' : '\n'
    // Dentro de una lista, escribir crea el elemento que toca: en «Fuentes» un
    // enlace y en una pregunta de selección múltiple una opción. En cualquier
    // otro contenedor, un párrafo.
    const cuerpo = fresh.kind === 'fuentes' ? `  \\fuente{${value}}\n`
      : fresh.kind === 'mcq' ? `  \\opcion{${value}}\n`
        : fresh.kind === 'lista' ? `  \\item ${value}\n`
          : `${value}\n`
    const inserted = `${prefix}${cuerpo}`
    // Insertar es el único caso en el que el rango propio no comprueba nada
    // —está vacío—, así que lo que tiene que seguir intacto es el contenedor.
    const problem = applyFieldEdit(
      ytext,
      { name: 'nuevo', span: { from: at, to: at }, value: '' },
      inserted,
      { span: fresh.span, expected: sourceOf(fresh) }
    )
    if (problem === STALE) {
      refresh()
      warn('El documento cambió mientras tanto. Inténtalo otra vez.')
      return
    }
    // El cursor sigue al texto que se acaba de escribir, no al final de la
    // línea: en una lista eso sería fuera de la llave del `\fuente{…}`.
    placeCaret(at + prefix.length + cuerpo.indexOf(value) + value.length)
  }

  /** Añade un hijo al final de un contenedor. */
  function addInside(container: Block, blockKind?: BlockKind, template?: string) {
    structural(container, (fresh) => {
      const at = insideOf(fresh)
      if (at === null) return null
      const guard = { span: fresh.span, expected: sourceOf(fresh) }
      const result = insertBlock(ytext, at, blockKind ?? childKind(fresh.kind), guard, template)
      if (result === STALE) return STALE
      // La plantilla dice con su `|` dónde se empieza a escribir; hasta ahora
      // ese dato se calculaba y se tiraba, y el bloque nuevo nacía sin cursor.
      placeCaret(result)
      return null
    })
  }

  function insert(at: number, blockKind: BlockKind, template?: string) {
    const result = insertBlock(ytext, at, blockKind, undefined, template)
    if (result === STALE) { refresh(); return }
    placeCaret(result)
  }

  /**
   * Escribe un bloque nuevo pegado a otro, delante o detrás.
   *
   * Es lo que hace la tira «+» que aparece entre dos bloques, y también por
   * donde entra una imagen pegada dentro de un párrafo: la macro de la captura
   * no se puede plantillar de antemano porque hasta que el archivo no está
   * subido no hay nombre que poner, y por eso se admite un `template`.
   *
   * La guarda es el bloque vecino: el sitio se dice con su rango, así que si el
   * rango ya no es el que era, el sitio tampoco.
   */
  function insertAt(
    block: Block,
    edge: 'before' | 'after',
    blockKind: BlockKind,
    template?: string
  ) {
    structural(block, (fresh) => {
      const at = edge === 'before' ? fresh.span.from : fresh.span.to
      const result = insertBlock(ytext, at, blockKind, {
        span: fresh.span,
        expected: sourceOf(fresh)
      }, template)
      if (result === STALE) return STALE
      placeCaret(result)
      return null
    })
  }

  /**
   * Suelta un bloque delante o detrás de otro. Solo entre hermanos: mover un
   * bloque dentro o fuera de un contenedor es otra operación —hay que
   * reindentar y el rango de destino es de otro padre—, y aquí se rechaza.
   */
  function moveTo(sourceId: string, targetId: string, edge: 'before' | 'after') {
    if (parentOf(sourceId) !== parentOf(targetId)) return
    const block = blockAt(blocks.value, sourceId)
    if (!block) return
    structural(block, (fresh) => {
      const siblings = siblingsAt(blocks.value, fresh.id)
      const index = siblings.indexOf(fresh)
      const target = blockAt(blocks.value, targetId)
      const to = target ? siblings.indexOf(target) : -1
      if (index === -1 || to === -1) return STALE
      return moveBlockTo(ytext, siblings, index, to, edge, text.value)
    })
  }

  /**
   * Cambia el tipo de un bloque. Lo que no se puede escribir —un cuerpo con
   * llaves sin cerrar dentro de un `\section{…}`— se avisa en el bloque en vez
   * de escribirse a medias.
   */
  function convert(block: Block, blockKind: BlockKind) {
    structural(block, (fresh) => {
      const problem = convertBlock(ytext, fresh, blockKind, text.value)
      if (problem && problem !== STALE) { report(`${block.id}:convertir`, problem); return null }
      report(`${block.id}:convertir`, null)
      return problem
    })
  }

  /**
   * Las filas de una tabla. Son las tres operaciones que cambian su forma; el
   * contenido de una celda es un campo como cualquier otro y va por `edit`.
   */
  const addRow = (block: Block, index: number) =>
    structural(block, f => insertRow(ytext, f, index, text.value))
  const deleteRow = (block: Block, index: number) =>
    structural(block, f => removeRow(ytext, f, index, text.value))
  const shiftRow = (block: Block, index: number, dir: -1 | 1) =>
    structural(block, f => moveRow(ytext, f, index, dir, text.value))

  /** La dirección del padre: `'2.1.0'` → `'2.1'`, y `''` para los de arriba. */
  function parentOf(id: string): string {
    return id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : ''
  }

  return {
    text,
    blocks,
    /** Avisos de validación, indexados por `«id de bloque»:«campo»`. */
    problems,
    /** Aviso pasajero cuando una acción llegó tarde; `null` si no hay. */
    notice,
    collapsed,
    caret,
    placeCaret,
    toggleCollapse,
    refresh,
    sourceOf,
    edit,
    split,
    editBody,
    setLanguage,
    rename,
    addInside,
    insert,
    insertAt,
    convert,
    addRow,
    deleteRow,
    shiftRow,
    writeInside,
    moveTo,
    dragging,
    dropTarget,
    remove: (block: Block) => structural(block, f => removeBlock(ytext, f, text.value)),
    duplicate: (block: Block) => structural(block, f => duplicateBlock(ytext, f, text.value)),
    toggle: (block: Block) => structural(block, f => toggleOption(ytext, f, text.value)),
    move: (block: Block, dir: -1 | 1) => structural(block, (fresh) => {
      const siblings = siblingsAt(blocks.value, fresh.id)
      const index = siblings.indexOf(fresh)
      if (index === -1) return STALE
      return moveBlock(ytext, siblings, index, dir, text.value)
    })
  }
}
