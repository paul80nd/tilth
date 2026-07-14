import { useState } from 'react'
import { currentTheme, toggleTheme } from '../lib/theme'

/** Small light/dark switch. Purely presentational state — the source of truth is the
 *  `.dark` class on <html>, driven by lib/theme. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme())
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(toggleTheme())}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className="grid h-9 w-9 place-items-center rounded-md border border-line text-muted transition-colors hover:bg-sunken hover:text-ink"
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  )
}
