import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlantNode, PhaseSpan } from '../schema/plant'
import { updateNode } from '../app/editNode'
import { deepEqual } from '../lib/equal'
import { MONTH_INITIALS, MONTH_NAMES, PHASE_META, PHASE_ORDER } from '../lib/calendar'
import { toCalendarDraft, fromCalendarDraft, type CalendarDraft } from '../lib/calendarEdit'
import CalendarBar from './CalendarBar'

// A modal for editing the 12-month activity calendar — a row per phase code (sow, prune,
// harvest…) with a tick per month it happens and an optional note — alongside a LIVE preview of
// the exact CalendarBar the cheatsheet shows. Pre-filled from the resolved value (so an inherited
// calendar is the starting point); saving writes the node's own calendar through the normal merge
// seam, which overrides the inheritance. Unchanged → no write (keeps provenance).

const CURRENT_MONTH = new Date().getMonth() + 1

/** The legend colour for a phase code — mirrors CalendarBar. */
function tokenColour(code: (typeof PHASE_ORDER)[number]): string {
  return `var(--tl-phase-${PHASE_META[code].token})`
}

export function CalendarEditor({
  node,
  calendar,
  onClose,
}: {
  node: PlantNode
  /** The resolved (possibly inherited) calendar currently shown — the editor's starting point. */
  calendar: PhaseSpan[] | undefined
  onClose: () => void
}) {
  const initial = useMemo(() => toCalendarDraft(calendar), [calendar])
  const [draft, setDraft] = useState<CalendarDraft>(initial)
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

  // Rebuilt on every change → the preview is exactly what the cheatsheet will render.
  const preview = useMemo(() => fromCalendarDraft(draft), [draft])
  const dirty = !deepEqual(draft, initial)

  function toggleMonth(code: (typeof PHASE_ORDER)[number], monthIdx: number) {
    setDraft((d) => {
      const months = d[code].months.slice()
      months[monthIdx] = !months[monthIdx]
      return { ...d, [code]: { ...d[code], months } }
    })
  }

  function setNote(code: (typeof PHASE_ORDER)[number], note: string) {
    setDraft((d) => ({ ...d, [code]: { ...d[code], note } }))
  }

  async function onSave() {
    if (!dirty) return onClose()
    setSaving(true)
    setError(null)
    try {
      await updateNode(node, { calendar: preview })
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
        aria-label="Edit calendar"
        onClick={(e) => e.stopPropagation()}
        className="relative my-4 w-full max-w-3xl rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-h3 font-semibold">Calendar</h2>
            <p className="text-xs text-subtle">
              Tick the months each job happens; add a note (e.g. "under glass") for the whole row.
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

        {/* Live preview — the exact bar the cheatsheet will show. */}
        <div className="mb-5">
          <div className="mb-1.5 text-[0.6rem] font-medium uppercase tracking-wide text-subtle">Preview</div>
          <div className="overflow-hidden rounded-lg border border-line bg-card">
            <CalendarBar calendar={preview} month={CURRENT_MONTH} />
          </div>
        </div>

        {/* The grid of controls: a row per phase code, a checkbox per month, then a note. */}
        <div className="overflow-x-auto">
          <div className="grid min-w-[44rem] grid-cols-[8.5rem_repeat(12,minmax(0,1fr))_9rem] items-center gap-x-1 gap-y-1">
            <div />
            {MONTH_INITIALS.map((initial, i) => (
              <div key={i} className="text-center text-[0.65rem] font-semibold uppercase tracking-wide text-subtle" title={MONTH_NAMES[i]}>
                {initial}
              </div>
            ))}
            <div className="pl-2 text-[0.65rem] font-semibold uppercase tracking-wide text-subtle">Note</div>

            {PHASE_ORDER.map((code) => (
              <div key={code} className="contents">
                <div className="flex items-center gap-1.5 pr-2 text-sm text-muted">
                  <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: tokenColour(code) }} aria-hidden="true" />
                  <span className="truncate">{PHASE_META[code].label}</span>
                </div>
                {draft[code].months.map((on, i) => (
                  <div key={i} className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={on}
                      aria-label={`${PHASE_META[code].label} in ${MONTH_NAMES[i]}`}
                      onChange={() => toggleMonth(code, i)}
                      className="h-4 w-4 accent-brand"
                    />
                  </div>
                ))}
                <input
                  type="text"
                  value={draft[code].note}
                  placeholder="note"
                  onChange={(e) => setNote(code, e.target.value)}
                  className="ml-2 w-full rounded-md border border-line bg-card px-2 py-1 text-sm placeholder:text-subtle"
                />
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
