<script setup lang="ts">
/**
 * Banco de pruebas del modo visual. Solo en desarrollo.
 *
 * El editor visual trabaja sobre un `Y.Text`; que ese texto venga de Supabase o
 * de aquí le da igual. Esta página lo siembra en memoria, así que se puede
 * abrir, escribir y romper el modo visual **sin sesión, sin base de datos y sin
 * compilador** — que es justo lo que hacía falta para probar de verdad cada
 * cambio en vez de fiarse de que «debería funcionar».
 *
 *   http://localhost:3000/dev/visual
 */
import { MacGlassPanel } from '@macvue/core'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { TEMPLATE_FILES } from '~/features/projects/lib/template.generated'
import type { SupabaseYjsProvider } from '~/features/editor/lib/supabase-yjs-provider'

definePageMeta({ layout: false })

if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: 'Solo en desarrollo' })

/** Ejemplos: lo que de verdad se abre en el curso. */
const EJEMPLOS: Record<string, string> = {
  'main.tex': TEMPLATE_FILES['main.tex'] ?? '',
  'sección con caso y preguntas': TEMPLATE_FILES['sections/01-seccion.tex'] ?? '',
  'meta.tex': TEMPLATE_FILES['meta.tex'] ?? '',
  'cysec.cls (LaTeX puro)': TEMPLATE_FILES['tex/cysec.cls'] ?? '',
  'prosa con marcas': [
    'Un párrafo normal con \\textbf{negrita}, \\emph{cursiva} y \\texttt{código}.',
    '',
    'Otro con un \\eng{término en inglés}, una cita \\cite{togaf92} y un escape \\% del 5\\%.',
    '',
    '\\porque{cómo usar esta plantilla}{%',
    '  Marca tu elección cambiando \\texttt{\\textbackslash opcion} por',
    '  \\texttt{\\textbackslash opcion*}.%',
    '}',
    ''
  ].join('\n')
}

const elegido = ref('main.tex')
const path = computed(() => (elegido.value === 'meta.tex' ? 'meta.tex' : 'main.tex'))

const doc = shallowRef(new Y.Doc())
const provider = shallowRef<SupabaseYjsProvider | null>(null)
const texto = ref('')

/** Un proveedor de mentira: el editor visual solo usa `doc` y `awareness`. */
function fakeProvider(next: Y.Doc): SupabaseYjsProvider {
  return { doc: next, awareness: new Awareness(next) } as unknown as SupabaseYjsProvider
}

function cargar() {
  const next = new Y.Doc()
  next.getText('content').insert(0, EJEMPLOS[elegido.value] ?? '')
  next.getText('content').observe(() => { texto.value = next.getText('content').toString() })
  texto.value = next.getText('content').toString()
  doc.value = next
  provider.value = fakeProvider(next)
}

onMounted(cargar)
watch(elegido, cargar)
</script>

<template>
  <!-- Sin fondo propio: así el banco de pruebas se ve sobre el mismo fondo que
       la app y el cristal de los paneles se puede juzgar de verdad. -->
  <div class="h-screen flex flex-col">
    <MacGlassPanel material="clear" class="flex items-center gap-3 px-4 h-11 shrink-0 m-2">
      <strong class="text-[13px]">Banco de pruebas · modo visual</strong>
      <select v-model="elegido" class="input text-[12px] py-0.5">
        <option v-for="(_, nombre) in EJEMPLOS" :key="nombre" :value="nombre">{{ nombre }}</option>
      </select>
      <FormatBar />
      <span class="flex-1" />
      <span class="text-[11px] text-[var(--text-muted)]">sin sesión · sin base de datos</span>
    </MacGlassPanel>

    <div class="flex-1 min-h-0 grid grid-cols-2 gap-2 p-2 pt-0">
      <MacGlassPanel material="clear" class="pane">
        <!-- `key`: otro ejemplo es otro documento, igual que en la app real un
             archivo distinto remonta el editor. -->
        <VisualEditor v-if="provider" :key="elegido" :provider="provider" :path="path" :can-write="true" />
      </MacGlassPanel>
      <MacGlassPanel material="regular" class="pane">
        <pre class="h-full m-0 p-3 overflow-auto text-[11.5px]
                    font-mono whitespace-pre-wrap break-words text-[var(--text-muted)]">{{ texto }}</pre>
      </MacGlassPanel>
    </div>
  </div>
</template>
