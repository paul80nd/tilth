import { NavLink, Route, Routes } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle'
import BrowsePage from './pages/BrowsePage'
import CheatsheetPage from './pages/CheatsheetPage'
import PlantFormPage from './pages/PlantFormPage'
import GardenPage from './pages/GardenPage'
import JobsPage from './pages/JobsPage'
import TaxonomyPage from './pages/TaxonomyPage'
import DataPage from './pages/DataPage'

// App shell: a slim fixed header (wordmark + primary tabs + theme toggle) over the routed pages.
// The header never scrolls; each page owns the scroll below it — most via `Padded` (centred,
// vertical scroll), while Taxonomy fills the area and manages its own two-axis scroll.
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

/** Centred, vertically-scrollable layout for the ordinary pages. */
function Padded({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="z-10 flex-none border-b border-line bg-card/90 backdrop-blur">
        <div className="flex items-center gap-4 px-4 py-3">
          <NavLink to="/" className="font-display text-h1 font-semibold tracking-tight">
            Tilth
          </NavLink>
          <nav className="flex items-center gap-1">
            <Tab to="/">Browse</Tab>
            <Tab to="/taxonomy">Taxonomy</Tab>
            <Tab to="/garden">My garden</Tab>
            <Tab to="/jobs">Jobs</Tab>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Tab to="/data">Data</Tab>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <Routes>
          <Route path="/" element={<Padded><BrowsePage /></Padded>} />
          <Route path="/add" element={<Padded><PlantFormPage /></Padded>} />
          <Route path="/plant/:id" element={<Padded><CheatsheetPage /></Padded>} />
          <Route path="/plant/:id/edit" element={<Padded><PlantFormPage /></Padded>} />
          <Route path="/garden" element={<GardenPage />} />
          <Route path="/jobs" element={<Padded><JobsPage /></Padded>} />
          <Route path="/taxonomy" element={<TaxonomyPage />} />
          <Route path="/data" element={<Padded><DataPage /></Padded>} />
        </Routes>
      </main>
    </div>
  )
}
