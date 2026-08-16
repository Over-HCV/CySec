export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4
  },

  modules: [
    '@nuxtjs/supabase',
    '@unocss/nuxt',
    '@pinia/nuxt'
  ],

  components: [
    { path: '~/shared/components', prefix: '' },
    { path: '~/features/projects/components', prefix: '' },
    { path: '~/features/editor/components', prefix: '' },
    { path: '~/features/viewer/components', prefix: '' },
    { path: '~/features/visual/components', prefix: '' }
  ],

  imports: {
    dirs: ['shared/composables', 'features/*/composables']
  },

  // El orden importa: los tokens de macvue primero, nuestro shell después, que
  // reutiliza su acento y sobreescribe lo que haga falta.
  css: ['@macvue/core/style.css', '~/shared/styles/theme.css'],

  supabase: {
    redirectOptions: {
      login: '/auth',
      callback: '/confirm',
      // Solo el editor y la lista de proyectos exigen sesión; la vista previa
      // de una invitación tiene que poder verse antes de iniciar sesión.
      exclude: ['/auth', '/invite/**']
    }
  },

  runtimeConfig: {
    public: {
      // URL del servicio de compilación en Cloud Run (o localhost en desarrollo)
      compilerUrl: process.env.NUXT_PUBLIC_COMPILER_URL || 'http://localhost:8080'
    }
  },

  vite: {
    optimizeDeps: {
      // yjs debe existir una sola vez en el bundle: dos copias rompen el CRDT
      // en silencio (los updates de una instancia no aplican en la otra).
      include: ['yjs', 'y-protocols/awareness', 'lib0/encoding', 'lib0/decoding']
    }
  },

  typescript: {
    strict: true
  }
})
