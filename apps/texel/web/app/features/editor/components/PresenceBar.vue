<script setup lang="ts">
import type { ProviderUser } from '../lib/supabase-yjs-provider'

defineProps<{ me: ProviderUser, peers: ProviderUser[] }>()

/** `?? ''`: un nombre indefinido reventaba el render y se llevaba la cabecera
 *  entera por delante. Sin iniciales queda «?», que al menos se ve. */
const initials = (name?: string) =>
  (name ?? '').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?'

/** Lo que se enseña al pasar el ratón; el correo si nadie puso nombre. */
const label = (user: ProviderUser) => user.name?.trim() || 'Sin nombre'
</script>

<template>
  <div class="flex items-center -space-x-1.5">
    <div
      v-for="user in [me, ...peers]"
      :key="user.id"
      class="w-6 h-6 rounded-full grid place-items-center text-[10px] font-semibold text-white ring-2 ring-bg"
      :style="{ background: user.color }"
      :title="user.id === me.id ? `${label(user)} (tú)` : label(user)"
    >
      {{ initials(user.name) }}
    </div>
    <!-- Con un solo acompañante se pone el nombre: es la pregunta que uno se
         hace («¿quién está?») y con las iniciales sueltas hay que adivinarla. -->
    <span v-if="peers.length" class="pl-3 text-xs text-muted truncate max-w-40">
      {{ peers.length === 1
        ? `${label(peers[0]!)} en línea`
        : `${peers.length} colaboradores en línea` }}
    </span>
  </div>
</template>
