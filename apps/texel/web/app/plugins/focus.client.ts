// v-focus: enfoca el elemento al montarlo (campos que aparecen al vuelo).
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('focus', {
    mounted: (el: HTMLElement) => el.focus()
  })
})
