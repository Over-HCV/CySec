/**
 * Lleva al `<html>` todo lo que decide el aspecto de la aplicación:
 *
 *  · `data-theme`             — activa el bloque claro/oscuro de theme.css.
 *  · `data-macvue-appearance` — los componentes de macvue solo cambian de
 *    material con este atributo; sin él, sus diálogos salían con material
 *    claro y texto claro encima: ilegibles.
 *  · `data-macvue-glass`      — enciende o apaga la lente de macvue.
 *  · `data-detail`            — nivel de detalle, para las reglas de theme.css.
 *  · `data-accent`            — acento turquesa sobre los fondos azules.
 *
 * En modo «sistema» no se pone `data-theme` y el CSS sigue a macOS tal cual.
 *
 * Los tres últimos vivían en el `div` raíz de `app.vue`, dentro de `#__nuxt`.
 * Ahí no llegaban a nada teleportado: un menú abierto vive en `<body>`, fuera
 * de ese `div`, así que se quedaba sin las correcciones de detalle «bajo» —y
 * con ellas sin la anulación del `backdrop-filter`, que es lo que convierte a
 * un ancestro en bloque contenedor de los `position: fixed` de dentro. Desde
 * el `<html>` alcanzan a todo el documento.
 */
export default defineNuxtPlugin(() => {
  const { current: appearance } = useAppearance()
  const { current: detail } = useDetail()
  const { current: wallpaper } = useWallpaper()
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const root = document.documentElement

  const apply = () => {
    const dark = appearance.value === 'dark' || (appearance.value === 'system' && media.matches)

    if (appearance.value === 'system') delete root.dataset.theme
    else root.dataset.theme = appearance.value

    root.dataset.macvueAppearance = dark ? 'dark' : 'light'
    root.dataset.macvueGlass = detail.value === 'alto' ? 'on' : 'off'
    root.dataset.detail = detail.value

    // Sobre «sky» y «aqua» todo es azul y el acento de macOS se pierde ahí
    // dentro; el turquesa vuelve a destacar.
    if (wallpaper.value === 'sky' || wallpaper.value === 'aqua') root.dataset.accent = 'aqua'
    else delete root.dataset.accent
  }

  apply()
  media.addEventListener('change', apply)
  watch([appearance, detail, wallpaper], apply)
})
