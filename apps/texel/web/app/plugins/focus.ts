// v-focus: enfoca el elemento al montarlo (campos que aparecen al vuelo).
// Plugin universal, no .client: si solo existe en cliente, el render en
// servidor avisa «Failed to resolve directive: focus». `mounted` no corre en
// SSR de todos modos.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('focus', {
    mounted: (el: HTMLElement) => el.focus()
  })
})
