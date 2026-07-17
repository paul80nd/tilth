import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlantNode, SeasonalInterest } from '../schema/plant'
import { updateNode } from '../app/editNode'
import { seasonalInterest } from '../lib/calendar'
import { deepEqual } from '../lib/equal'
import { COLOUR_WORDS } from '../lib/colour'
import {
  EDIT_PARTS,
  EDIT_SEASONS,
  fromDraft,
  toDraft,
  type InterestDraft,
} from '../lib/seasonalEdit'
import { INTEREST_META } from '../lib/calendar'
import { SeasonalIcon } from './icons'
import SeasonStrip from './SeasonStrip'

// A modal for editing a plant's seasonal-interest grid — a cell per season × part (foliage ·
// flower · fruit · stem) with an on-show tick and a comma-separated colour field — alongside a
// LIVE preview of the exact strip the cheatsheet will show. Pre-filled from the resolved value
// (so an inherited grid is the starting point); saving writes the node's own grid through the
// normal merge seam, which overrides the inheritance. Unchanged → no write (keeps provenance).

const COLOUR_LIST_ID = 'tl-colour-words'

export function SeasonalInterestEditor({
  node,
  initial,
  onClose,
}: {
  node: PlantNode
  /** The resolved (possibly inherited) grid currently shown — the editor's starting point. */
  initial: SeasonalInterest | undefined
  onClose: () => void
}) {
  const [draft, setDraft] = useState<InterestDraft>(() => toDraft(initial))
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

  // Rebuilt on every keystroke → the preview is exactly what the cheatsheet will render.
  const next = useMemo(() => fromDraft(draft), [draft])
  const preview = useMemo(() => seasonalInterest(next), [next])
  const dirty = !deepEqual(next, initial ?? {})

  function setCell(season: (typeof EDIT_SEASONS)[number], part: (typeof EDIT_PARTS)[number], patch: Partial<InterestDraft[typeof season][typeof part]>) {
    setDraft((d) => ({
      ...d,
      [season]: { ...d[season], [part]: { ...d[season][part], ...patch } },
    }))
  }

  async function onSave() {
    if (!dirty) return onClose()
    setSaving(true)
    setError(null)
    try {
      await updateNode(node, { seasonalInterest: next })
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
        aria-label="Edit seasonal interest"
        onClick={(e) => e.stopPropagation()}
        className="relative my-4 w-full max-w-3xl rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
      >
        <datalist id={COLOUR_LIST_ID}>
          {COLOUR_WORDS.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>

        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-h3 font-semibold">Seasonal interest</h2>
            <p className="text-xs text-subtle">
              Tick a part to mark it on show that season; add colours (comma-separated) to tint it.
            </p>
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

        {/* Live preview — the exact strip the cheatsheet will show. */}
        <div className="mb-5">
          <div className="mb-1.5 text-[0.6rem] font-medium uppercase tracking-wide text-subtle">Preview</div>
          <div className="h-36 overflow-hidden rounded-lg border border-line bg-card">
            <SeasonStrip interest={preview} />
          </div>
        </div>

        {/* The grid of controls: a row per part, a column per season. */}
        <div className="overflow-x-auto">
          <div className="grid min-w-[34rem] grid-cols-[7rem_repeat(4,minmax(0,1fr))] gap-x-3 gap-y-2">
            <div />
            {EDIT_SEASONS.map((s) => (
              <div key={s} className="text-center text-[0.65rem] font-semibold uppercase tracking-wide text-subtle">
                {s}
              </div>
            ))}

            {EDIT_PARTS.map((part) => (
              <div key={part} className="contents">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <SeasonalIcon part={part} size={18} aria-hidden="true" />
                  {INTEREST_META[part].label}
                </div>
                {EDIT_SEASONS.map((season) => {
                  const cell = draft[season][part]
                  return (
                    <div key={season} className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={cell.on}
                        aria-label={`${INTEREST_META[part].label} in ${season}`}
                        onChange={(e) => setCell(season, part, { on: e.target.checked })}
                        className="h-4 w-4 shrink-0 accent-brand"
                      />
                      <input
                        type="text"
                        value={cell.colours}
                        list={COLOUR_LIST_ID}
                        placeholder="colours"
                        disabled={!cell.on}
                        // Typing a colour marks the part on show; clearing it leaves it on (blank = on, uncoloured).
                        onChange={(e) => setCell(season, part, { colours: e.target.value, on: cell.on || e.target.value.trim() !== '' })}
                        className="w-full rounded-md border border-line bg-card px-2 py-1 text-sm placeholder:text-subtle disabled:opacity-40"
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
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
