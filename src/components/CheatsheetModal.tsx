import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { usePlantDetail, CheatsheetContent } from './Cheatsheet'

// A pop-up showing a plant's cheatsheet in the full detail layout (via CheatsheetContent), opened
// from the Taxonomy view so inspecting a plant never navigates away — the tree keeps its scroll
// position. Closes on Escape, backdrop click, or ✕; locks body scroll while open. "Open full
// page →" jumps to the real detail route (for edit / delete) when wanted.
export function CheatsheetModal({ id, onClose }: { id: string; onClose: () => void }) {
  const data = usePlantDetail(id)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative my-4 w-full max-w-5xl rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link to={`/plant/${id}`} className="text-sm text-brand-ink hover:underline" onClick={onClose}>
            Open full page →
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-sunken hover:text-ink"
          >
            ✕
          </button>
        </div>
        {!data ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : !data.node ? (
          <p className="text-sm text-muted">No plant found.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <CheatsheetContent node={data.node} ancestors={data.ancestors} guides={data.guides} tasks={data.tasks} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
