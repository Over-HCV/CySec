import { defineConfig } from 'vitest/config'

/**
 * Los tests solo cubren `app/features/visual/lib/`: TypeScript plano que no
 * depende de Nuxt ni del navegador. Por eso `environment: 'node'` y ningún
 * plugin — arrancar Nuxt aquí solo añadiría segundos y puntos de fallo.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts']
  }
})
