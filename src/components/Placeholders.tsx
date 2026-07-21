import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'

// Shared page/panel placeholders: the quiet "Loading…" line shown while a live query resolves,
// and the "no plant found" empty state (a dashed card with a way back to Browse) used when a
// routed plant id doesn't resolve.

/** A quiet loading line. `className` appends to the base (e.g. `p-6`, `mt-3`) for context. */
export function Loading({ className }: { className?: string }) {
  return <p className={cx('text-sm text-muted', className)}>Loading…</p>
}

/** Empty state for an unresolved plant id — names the id when given, always offers a way back. */
export function NotFound({ id }: { id?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-card p-8 text-center">
      <p className="text-sm text-muted">{id ? `No plant found for "${id}".` : 'No plant found.'}</p>
      <Link to="/" className="mt-2 inline-block text-sm font-medium text-brand-ink hover:underline">
        ← Back to Browse
      </Link>
    </div>
  )
}
