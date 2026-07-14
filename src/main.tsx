import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { seedDemoIfEmpty } from './db/seed'
import { initTheme } from './lib/theme'
import './index.css'

// Apply the saved / system colour theme before first paint (avoids a flash).
initTheme()

// First run loads the fictional demo collection; a real import (dataSource === 'user') is
// never touched. Fire-and-forget — the UI reads the store reactively as it fills.
void seedDemoIfEmpty()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
