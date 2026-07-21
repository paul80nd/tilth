// Light/dark theme control. Not pure (touches the DOM + localStorage), but kept tiny and
// framework-free so main.tsx can apply the theme before first paint and the toggle can flip
// it. The class-based `.dark` on <html> is what the design-token bridge keys off.

const KEY = 'tilth-theme'
export type Theme = 'light' | 'dark'

function systemPrefersDark(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
}

/** The stored preference, or the system default if none saved. */
export function currentTheme(): Theme {
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return systemPrefersDark() ? 'dark' : 'light'
}

function apply(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

/** Apply the current theme on startup. */
export function initTheme(): void {
  apply(currentTheme())
}

/** Flip and persist; returns the new theme. */
export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
  localStorage.setItem(KEY, next)
  apply(next)
  return next
}
