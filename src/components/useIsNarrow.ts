import { useSyncExternalStore } from 'react'

// Is the viewport phone-narrow? A single matchMedia subscription (the React-19 way, via
// useSyncExternalStore) so components can switch between a desktop multi-column layout and a
// mobile sheet/drawer one. Matches Tailwind's `md` breakpoint (< 768px) so JS and CSS agree.
const QUERY = '(max-width: 767px)'

function subscribe(onChange: () => void): () => void {
  if (typeof matchMedia === 'undefined') return () => {}
  const mql = matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia(QUERY).matches
}

export function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => false, // no DOM (SSR/tests without a window) → assume wide
  )
}
