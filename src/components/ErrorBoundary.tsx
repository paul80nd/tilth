import { Component, type ErrorInfo, type ReactNode } from 'react'

// A last-resort catch for uncaught render errors, so a bug in one screen shows a recovery
// card instead of a blank page — the whole app is local-first, so a white screen looks like
// lost data even when nothing was lost. The card reassures (your data is safe in the browser)
// and offers the two ways out: reload the app, or jump to Data to save a backup first.
// Class component because React only exposes error catching via the class lifecycle.

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it for debugging; there's no remote logging (nothing leaves the device).
    console.error('Uncaught error:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md rounded-lg border border-line bg-card p-6 text-center shadow-sm">
          <h1 className="font-display text-h2 font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            Tilth hit an unexpected error on this screen. Your plants and garden are still
            safe on this device — nothing was lost. Reload to carry on.
          </p>
          {error.message && (
            <p className="mt-3 rounded-md bg-sunken px-3 py-2 text-left font-mono text-xs text-subtle">
              {error.message}
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-onbrand hover:opacity-90"
            >
              Reload Tilth
            </button>
            <a
              href="#/data"
              onClick={() => this.setState({ error: null })}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
            >
              Save a backup
            </a>
          </div>
        </div>
      </div>
    )
  }
}
