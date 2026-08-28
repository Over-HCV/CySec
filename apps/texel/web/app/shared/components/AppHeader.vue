<script setup lang="ts">
import { MacGlassPanel } from '@macvue/core'
</script>

<template>
  <!-- Barra de título flotante, despegada del borde superior. `role="banner"`
       porque el panel renderiza un `div` y sin él se perdería la región de
       cabecera.
       Nunca debe empujar el ancho de la ventana: el bloque de la izquierda
       (leading) se encoge y trunca, el de la derecha (trailing) se queda fijo.

       `relative z-30` no es decorativo: el cristal de la barra crea su propio
       contexto de apilado, así que los menús que se abren desde aquí (opciones
       de compilación, fondo, apariencia) no pueden salir por encima de los
       paneles del cuerpo —que vienen después en el DOM y también son cristal—
       si la barra entera no se pone delante. Sin esto el menú se ve cortado por
       el panel del PDF. -->
  <MacGlassPanel
    material="clear"
    role="banner"
    class="relative z-30 flex items-center gap-2 px-3 mx-3 mt-3 h-[var(--header-h)] shrink-0"
  >
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <slot name="leading" />
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <slot name="trailing" />
    </div>
  </MacGlassPanel>
</template>
