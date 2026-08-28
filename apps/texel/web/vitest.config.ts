import { defineConfig } from 'vitest/config'

/**
 * Los tests solo cubren TypeScript plano que no depende de Nuxt ni del
 * navegador: los `lib/` de `app/features/` y de `app/shared/`. Por eso
 * `environment: 'node'` y ningún plugin — arrancar Nuxt aquí solo añadiría
 * segundos y puntos de fallo. Lo que necesita medir el DOM se queda fuera; por
 * eso las cuentas de `AppMenu` viven en `shared/lib/anchor-menu.ts` y no en el
 * componente.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts']
  }
})
