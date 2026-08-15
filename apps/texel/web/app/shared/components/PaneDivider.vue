<script setup lang="ts">
/**
 * Separador arrastrable entre paneles. Zona de agarre de 9 px con una línea de
 * 1 px dentro, como en las apps de macOS: fácil de coger, discreto en reposo.
 * Doble clic restablece el tamaño.
 */
const props = withDefaults(defineProps<{
  direction?: 'vertical' | 'horizontal'   // vertical = separa columnas
  disabled?: boolean
}>(), { direction: 'vertical', disabled: false })

const emit = defineEmits<{
  /** Delta acumulado en píxeles desde el inicio del arrastre. */
  move: [{ x: number, y: number }]
  start: []
  end: []
  reset: []
}>()

const dragging = ref(false)
let origin = { x: 0, y: 0 }

function onPointerDown(event: PointerEvent) {
  if (props.disabled) return
  dragging.value = true
  origin = { x: event.clientX, y: event.clientY }
  ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
  // Sin esto, arrastrar sobre el editor selecciona texto.
  document.body.style.userSelect = 'none'
  document.body.style.cursor = props.direction === 'vertical' ? 'col-resize' : 'row-resize'
  emit('start')
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  emit('move', { x: event.clientX - origin.x, y: event.clientY - origin.y })
}

function onPointerUp(event: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  ;(event.target as HTMLElement).releasePointerCapture(event.pointerId)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  emit('end')
}
</script>

<template>
  <div
    class="divider"
    :class="[direction, { dragging, disabled }]"
    role="separator"
    :aria-orientation="direction === 'vertical' ? 'vertical' : 'horizontal'"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick="emit('reset')"
  >
    <span class="line" />
  </div>
</template>

<style scoped>
.divider {
  position: relative;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  z-index: 5;
}
.divider.vertical { width: 9px; margin: 0 -4px; cursor: col-resize; }
.divider.horizontal { height: 9px; margin: -4px 0; cursor: row-resize; }
.divider.disabled { cursor: default; }

.line {
  background: var(--border);
  transition: background 120ms ease;
}
.divider.vertical .line { width: 1px; height: 100%; }
.divider.horizontal .line { height: 1px; width: 100%; }

.divider:hover .line,
.divider.dragging .line { background: var(--accent); }
.divider.disabled:hover .line { background: var(--border); }
</style>
