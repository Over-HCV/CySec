/**
 * Sincroniza la apariencia de macvue con la del sistema.
 *
 * Sus componentes solo cambian a oscuro con `data-macvue-appearance="dark"` en
 * la raíz; sin esto, los diálogos salían con material claro y texto claro
 * encima — ilegibles.
 */
export default defineNuxtPlugin(() => {
  const media = window.matchMedia('(prefers-color-scheme: dark)')

  const apply = () => {
    document.documentElement.dataset.macvueAppearance = media.matches ? 'dark' : 'light'
  }

  apply()
  media.addEventListener('change', apply)
})
