<script setup lang="ts">
import type { ProviderUser } from '../lib/supabase-yjs-provider'

defineProps<{ me: ProviderUser, peers: ProviderUser[] }>()

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
</script>

<template>
  <div class="flex items-center -space-x-1.5">
    <div
      v-for="user in [me, ...peers]"
      :key="user.id"
      class="w-6 h-6 rounded-full grid place-items-center text-[10px] font-semibold text-white ring-2 ring-bg"
      :style="{ background: user.color }"
      :title="user.id === me.id ? `${user.name} (tú)` : user.name"
    >
      {{ initials(user.name) }}
    </div>
    <span v-if="peers.length" class="pl-3 text-xs text-muted">
      {{ peers.length }} {{ peers.length === 1 ? 'colaborador' : 'colaboradores' }} en línea
    </span>
  </div>
</template>
