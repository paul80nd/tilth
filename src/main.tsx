import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { seedDemoIfEmpty } from './db/seed'
import { initTheme } from './app/theme'
import './index.css'

// Apply the saved / system colour theme before first paint (avoids a flash).
initTheme()

// Ask the browser to keep our IndexedDB from being evicted. Evergreen browsers may clear idle
// site data under storage pressure (Safari most eagerly), taking a user's plants and garden
// with it — the JSON export is still the durable backup, but persistence buys headroom against
// silent loss. Idempotent; no-op where unsupported or refused; only requested if not already
// granted.
if (navigator.storage?.persist) {
  navigator.storage
    .persisted()
    .then((already) => (already ? true : navigator.storage.persist()))
    .catch(() => {})
}

// First run loads the fictional demo collection; a real import (dataSource === 'user') is
// never touched. Fire-and-forget — the UI reads the store reactively as it fills.
void seedDemoIfEmpty()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
