import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({ scale: 1.1, cdn: undefined })
  ],
  theme: {
    colors: {
      bg: 'var(--bg)',
      sunken: 'var(--bg-sunken)',
      raised: 'var(--bg-raised)',
      border: 'var(--border)',
      text: 'var(--text)',
      muted: 'var(--text-muted)',
      accent: 'var(--accent)',
      accentSoft: 'var(--accent-soft)',
      danger: 'var(--danger)',
      success: 'var(--success)',
      warning: 'var(--warning)'
    }
  },
  shortcuts: {
    'btn': 'px-3 py-1.5 rounded border border-border bg-raised text-text hover:bg-sunken transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-primary': 'px-3 py-1.5 rounded bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed border-none',
    'input': 'px-3 py-1.5 rounded border border-border bg-bg text-text outline-none focus:border-accent',
    'card': 'rounded-lg border border-border bg-raised p-4'
  }
})
