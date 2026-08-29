<script setup lang="ts">
/**
 * De dónde sale una imagen: soltarla, buscarla o pegarla.
 *
 * Las tres vías llevan al mismo sitio —un `File`—, así que el diálogo no
 * pregunta cuál se va a usar: acepta la que llegue. Pegar es la que más se usa
 * (una captura recién hecha vive en el portapapeles y en ningún archivo), y por
 * eso se escucha `paste` en toda la ventana mientras el diálogo está abierto.
 *
 * No sube nada: reúne el archivo y el nombre y los entrega. Quien sube es
 * `VisualEditor`, que es quien sabe dónde va a ir el bloque.
 */
import { ImagePlus, X } from 'lucide-vue-next'
import { esTipoAceptado, plate, slug, TIPOS_ACEPTADOS } from '~/shared/lib/asset-name'

const props = defineProps<{
  /** Está subiendo: se bloquean los dos botones. */
  busy?: boolean
  /** Lo que salió mal al subir, si salió algo. */
  error?: string
}>()

const emit = defineEmits<{ close: [], submit: [file: File, name: string] }>()

const file = ref<File | null>(null)
const name = ref(plate())
const sobre = ref(false)
const aviso = ref('')

/** Vista previa local: no hace falta subir nada para ver qué se ha elegido. */
const preview = ref<string | null>(null)
watch(file, (nuevo) => {
  if (preview.value) URL.revokeObjectURL(preview.value)
  // De un PDF no hay miniatura que sacar sin pdf.js: se enseña su nombre.
  preview.value = nuevo && nuevo.type !== 'application/pdf' ? URL.createObjectURL(nuevo) : null
})
onBeforeUnmount(() => { if (preview.value) URL.revokeObjectURL(preview.value) })

function take(candidato: File | null | undefined) {
  if (!candidato) return
  if (!esTipoAceptado(candidato.type)) {
    aviso.value = 'Solo PNG, JPG o PDF: son los que el compilador sabe poner en el documento.'
    return
  }
  aviso.value = ''
  file.value = candidato
}

function onDrop(event: DragEvent) {
  sobre.value = false
  take(event.dataTransfer?.files?.[0])
}

/** Pegar con ⌘V mientras el diálogo está abierto. */
function onPaste(event: ClipboardEvent) {
  const pegado = event.clipboardData?.files?.[0]
  if (!pegado) return
  event.preventDefault()
  take(pegado)
}

onMounted(() => window.addEventListener('paste', onPaste))
onBeforeUnmount(() => window.removeEventListener('paste', onPaste))

const input = useTemplateRef<HTMLInputElement>('input')

function submit() {
  if (!file.value || props.busy) return
  emit('submit', file.value, slug(name.value) || plate())
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/30 backdrop-blur-sm grid place-items-center p-5"
    @click.self="emit('close')"
  >
    <div class="glass-menu rounded-[var(--radius-lg)] p-5 w-full max-w-md">
      <header class="flex items-center mb-3">
        <h2 class="text-base font-semibold m-0">Poner una imagen</h2>
        <span class="flex-1" />
        <button class="btn p-1" title="Cerrar" @click="emit('close')"><X :size="14" /></button>
      </header>

      <button
        class="zona"
        :class="{ 'zona-sobre': sobre }"
        @click="input?.click()"
        @dragover.prevent="sobre = true"
        @dragleave="sobre = false"
        @drop.prevent="onDrop"
      >
        <img v-if="preview" :src="preview" alt="" class="max-h-[180px] max-w-full rounded-[6px]">
        <template v-else-if="file">
          <ImagePlus :size="18" />
          <span class="text-xs">{{ file.name }}</span>
        </template>
        <template v-else>
          <ImagePlus :size="18" />
          <span class="text-xs">Suelta la imagen aquí, pégala con ⌘V o haz clic para buscarla</span>
        </template>
      </button>

      <input
        ref="input"
        type="file"
        class="hidden"
        :accept="TIPOS_ACEPTADOS"
        @change="take(($event.target as HTMLInputElement).files?.[0])"
      >

      <label class="flex items-center gap-2 mt-3">
        <span class="text-xs text-muted shrink-0">Nombre</span>
        <input v-model="name" class="input flex-1 min-w-0 font-mono text-xs" spellcheck="false">
      </label>
      <p class="text-[11px] text-[var(--text-faint)] mt-1 mb-0">
        Se guarda en <code>pics/</code>. El nombre sale de una matrícula para que sea fácil de
        leer y de repetir en voz alta; cámbialo si prefieres otro.
      </p>

      <p v-if="aviso || error" class="text-xs text-[var(--danger)] mt-2 mb-0">{{ aviso || error }}</p>

      <footer class="flex justify-end gap-2 mt-4">
        <button class="btn" :disabled="busy" @click="emit('close')">Cancelar</button>
        <button class="btn-primary" :disabled="!file || busy" @click="submit">
          {{ busy ? 'Subiendo…' : 'Poner imagen' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.zona {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 132px;
  padding: 12px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  background: var(--bg-sunken);
  color: var(--text-muted);
  text-align: center;
  cursor: pointer;
}
.zona:hover, .zona-sobre {
  border-color: var(--accent);
  color: var(--text);
}
</style>
