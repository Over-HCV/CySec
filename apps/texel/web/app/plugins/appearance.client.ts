/**
 * Lleva la apariencia elegida (`useAppearance`) a todo el documento:
 *
 *  · `data-theme` en <html>  — activa el bloque claro/oscuro de theme.css.
 *  · `data-macvue-appearance` — los componentes de macvue solo cambian de
 *    material con este atributo; sin él, sus diálogos salían con material
 *    claro y texto claro encima: ilegibles.
 *
 * En modo «sistema» no se pone `data-theme` y el CSS sigue a macOS tal cual.
 */
export default defineNuxtPlugin(() => {
  const { current } = useAppearance()
  const media = window.matchMedia('(prefers-color-scheme: dark)')

  const apply = () => {
    const dark = current.value === 'dark' || (current.value === 'system' && media.matches)
    const root = document.documentElement

    if (current.value === 'system') delete root.dataset.theme
    else root.dataset.theme = current.value

    root.dataset.macvueAppearance = dark ? 'dark' : 'light'
  }

  apply()
  media.addEventListener('change', apply)
  watch(current, apply)
})
