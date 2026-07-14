import { NavLink, Route, Routes } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle'
import BrowsePage from './pages/BrowsePage'
import CheatsheetPage from './pages/CheatsheetPage'
import GardenPage from './pages/GardenPage'

// App shell: a slim header (wordmark + primary tabs + theme toggle) over the routed pages.
// Browse is the whole plant knowledge base; "My garden" (holdings) arrives in a later step.
// Kept semantic and palette-light — styled only via the design-token utilities.
function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-tint text-brand-ink' : 'text-muted hover:bg-sunken hover:text-ink',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <NavLink to="/" className="font-display text-h1 font-semibold tracking-tight">
            Tilth
          </NavLink>
          <nav className="flex items-center gap-1">
            <Tab to="/">Browse</Tab>
            <Tab to="/garden">My garden</Tab>
          </nav>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/plant/:id" element={<CheatsheetPage />} />
          <Route path="/garden" element={<GardenPage />} />
        </Routes>
      </main>
    </div>
  )
}
