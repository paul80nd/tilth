import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlantNode, Size } from '../schema/plant'
import { updateNode } from '../app/editNode'
import { deepEqual } from '../lib/equal'
import { fromSizeDraft, toSizeDraft, type SizeDraft } from '../lib/sizeEdit'
import SizeCard from './SizeCard'

// A modal for editing the ultimate size (height · spread · time to size) with a live preview of the
// to-scale Size card. The three values are free text kept verbatim as labels (the card parses them
// for the drawing) — bands, cm/m and "12m+"/"2–5 years" all work. Saving writes the node's own size
// via the normal merge seam (stamped `manual`); an unchanged edit writes nothing.

const FIELDS: Array<{ key: keyof SizeDraft; label: string; placeholder: string }> = [
  { key: 'height', label: 'Height', placeholder: 'e.g. 0.1–0.5m or 2-4m' },
  { key: 'spread', label: 'Spread', placeholder: 'e.g. 0.5m' },
  { key: 'timeToSize', label: 'Time to full size', placeholder: 'e.g. 2–5 years' },
]

export function SizeEditor({
  node,
  size,
  onClose,
}: {
  node: PlantNode
  /** The resolved (possibly inherited) size currently shown — the editor's starting point. */
  size: Size | undefined
  onClose: () => void
}) {
  const initial = useMemo(() => toSizeDraft(size), [size])
  const [draft, setDraft] = useState<SizeDraft>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const preview = useMemo(() => fromSizeDraft(draft), [draft])
  const dirty = !deepEqual(draft, initial)

  async function onSave() {
    if (!dirty) return onClose()
    setSaving(true)
    setError(null)
    try {
      await updateNode(node, { size: preview })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit size"
        onClick={(e) => e.stopPropagation()}
        className="relative my-4 w-full max-w-xl rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-h3 font-semibold">Size</h2>
            <p className="text-xs text-subtle">Ultimate height and spread, and how long it takes to get there. Free text — bands, cm or m.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-sunken hover:text-ink"
          >
            ✕
          </button>
        </div>

        {/* Live preview — the exact to-scale card the cheatsheet will show. */}
        <div className="mb-5">
          <div className="mb-1.5 text-[0.6rem] font-medium uppercase tracking-wide text-subtle">Preview</div>
          <div className="overflow-hidden rounded-lg border border-line bg-card">
            <SizeCard size={preview} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-sm font-medium text-muted">{f.label}</span>
              <input
                type="text"
                value={draft[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-sm placeholder:text-subtle"
              />
            </label>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-accent-ink">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-onbrand hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
