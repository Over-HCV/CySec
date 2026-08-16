<template>
  <!-- Barra de título flotante: mismo cristal que los paneles, despegada del
       borde superior. Nunca debe empujar el ancho de la ventana: el bloque de
       la izquierda (leading) se encoge y trunca, el de la derecha (trailing)
       se queda fijo. -->
  <header
    class="chrome-bar flex items-center gap-2 px-3 mx-3 mt-3 h-[var(--header-h)] shrink-0 overflow-hidden"
  >
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <slot name="leading" />
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <slot name="trailing" />
    </div>
  </header>
</template>
