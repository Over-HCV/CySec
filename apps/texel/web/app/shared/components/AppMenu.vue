<script setup lang="ts">
/**
 * Menú anclado a su botón.
 *
 * Existe porque los menús de macvue no sirven en la barra de título. El panel
 * de la cabecera es un `MacGlassPanel`, y eso es `overflow: hidden`, así que un
 * menú tiene que salir del árbol para verse: macvue lo teleporta a `<body>` y
 * después lo coloca `position: fixed` alineando la opción marcada sobre el
 * botón (`position="item-aligned"`, fijo en el componente, sin forma de
 * cambiarlo). Con el botón a 40 px del borde superior de la ventana esa
 * alineación no cabe y el menú acaba fuera de la pantalla o cortado.
 *
 * Aquí se coloca al revés: debajo del botón, y si no cabe debajo, encima;
 * siempre pegado al viewport con 8 px de margen. La superficie es `.glass-menu`
 * —la misma de `ShareDialog` y del menú de bloques del editor visual—, que ya
 * es casi opaca a propósito: un menú tiene que leerse sobre cualquier cosa.
 */
import { ChevronDown } from 'lucide-vue-next'
import { placeMenu, type Side } from '~/shared/lib/anchor-menu'

// Dos raíces —el botón y el teleport—, así que nada de atributos heredados:
// irían a parar a ninguna parte con un aviso de Vue.
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** Borde del botón con el que se alinea el menú. */
  align?: 'start' | 'end'
  disabled?: boolean
  /**
   * Hacia dónde intenta abrirse. Sigue siendo una preferencia: si por ese lado
   * no cabe y por el otro hay más sitio, se va al otro. Ver `anchor-menu.ts`.
   */
  prefer?: Side
  /** Clases del botón. Por defecto, el aspecto de un `MacButton` pequeño. */
  triggerClass?: string
  title?: string
  ariaLabel?: string
}>(), {
  align: 'start',
  disabled: false,
  prefer: 'below',
  triggerClass: 'menu-trigger',
  title: undefined,
  ariaLabel: undefined
})

const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)

/**
 * Escondido pero ya `fixed`: mientras se mide, un `div` en el flujo normal al
 * final del `body` puede sacar una barra de scroll y mover la página entera
 * justo antes de colocarse.
 */
const HIDDEN = { position: 'fixed', top: '0px', left: '0px', visibility: 'hidden' }

const style = ref<Record<string, string>>({ ...HIDDEN })

function place() {
  const anchor = trigger.value?.getBoundingClientRect()
  const box = menu.value?.getBoundingClientRect()
  if (!anchor || !box) return

  // El alto se limita a lo que quede libre: así el menú scrollea en vez de
  // salirse por el borde. Las cuentas están en `anchor-menu.ts`.
  const at = placeMenu(
    anchor,
    box,
    { width: window.innerWidth, height: window.innerHeight },
    props.align,
    props.prefer
  )

  style.value = {
    position: 'fixed',
    left: `${at.left}px`,
    top: `${at.top}px`,
    minWidth: `${at.minWidth}px`,
    maxHeight: `${at.maxHeight}px`,
    visibility: 'visible'
  }
}

function items(): HTMLElement[] {
  if (!menu.value) return []
  return Array.from(menu.value.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'))
}

function close(focusTrigger = true) {
  if (!open.value) return
  open.value = false
  style.value = { ...HIDDEN }
  if (focusTrigger) trigger.value?.focus()
}

async function toggle() {
  if (props.disabled) return
  if (open.value) return close()
  open.value = true
  await nextTick()
  place()
  items()[0]?.focus()
}

// Cerrar al seleccionar: cada `AppMenuItem` avisa por aquí.
provide('appMenuClose', () => close())

function onPointerDown(event: PointerEvent) {
  const target = event.target as Node
  if (trigger.value?.contains(target) || menu.value?.contains(target)) return
  close(false)
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    return close()
  }
  const list = items()
  if (!list.length) return
  const index = list.indexOf(document.activeElement as HTMLElement)

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    list[(index + step + list.length) % list.length]?.focus()
  } else if (event.key === 'Home') {
    event.preventDefault()
    list[0]?.focus()
  } else if (event.key === 'End') {
    event.preventDefault()
    list.at(-1)?.focus()
  }
}

// El menú es `fixed`: si la ventana cambia de tamaño o algo scrollea debajo, la
// referencia se mueve y él no. Se recoloca, que es menos brusco que cerrarlo.
watch(open, (value) => {
  const method = value ? 'addEventListener' : 'removeEventListener'
  window[method]('pointerdown', onPointerDown as EventListener, true)
  window[method]('keydown', onKeydown as EventListener)
  window[method]('resize', place)
  window[method]('scroll', place, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onPointerDown as EventListener, true)
  window.removeEventListener('keydown', onKeydown as EventListener)
  window.removeEventListener('resize', place)
  window.removeEventListener('scroll', place, true)
})
</script>

<template>
  <button
    ref="trigger"
    type="button"
    :class="triggerClass"
    :disabled="disabled"
    :title="title"
    :aria-label="ariaLabel"
    aria-haspopup="menu"
    :aria-expanded="open"
    @click="toggle"
  >
    <slot name="trigger" :open="open">
      <ChevronDown :size="12" />
    </slot>
  </button>

  <!-- A `body` a propósito: dentro de la cabecera nunca se vería, y fuera del
       `div` de la página tampoco perdería nada — los atributos de tema y detalle
       viven en el `<html>` (ver `plugins/appearance.client.ts`). -->
  <Teleport v-if="open" to="body">
    <div ref="menu" class="glass-menu app-menu" role="menu" :style="style">
      <slot />
    </div>
  </Teleport>
</template>
