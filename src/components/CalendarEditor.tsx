import { useMemo } from 'react'
import type { PlantNode, PhaseSpan } from '../schema/plant'
import { updateNode, clearNodeField } from '../app/editNode'
import { MONTH_INITIALS, MONTH_NAMES, PHASE_META, PHASE_ORDER } from '../lib/calendar'
import { toCalendarDraft, fromCalendarDraft, type CalendarDraft } from '../lib/calendarEdit'
import CalendarBar from './CalendarBar'
import { EditorFooter } from './EditorControls'
import { FieldEditorModal } from './FieldEditorModal'
import { useEditorDraft } from './useEditorDraft'

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
  const { draft, setDraft, saving, error, dirty, onSave, onClear } = useEditorDraft<CalendarDraft>({
    initial,
    onClose,
    save: (d) => updateNode(node, { calendar: fromCalendarDraft(d) }),
    clear: () => clearNodeField(node.id, 'calendar'),
  })

  // Rebuilt on every change → the preview is exactly what the cheatsheet will render.
  const preview = useMemo(() => fromCalendarDraft(draft), [draft])

  function toggleMonth(code: (typeof PHASE_ORDER)[number], monthIdx: number) {
    setDraft((d) => {
      const months = d[code].months.slice()
      months[monthIdx] = !months[monthIdx]
      return { ...d, [code]: { ...d[code], months } }
    })
  }

  function setAllMonths(code: (typeof PHASE_ORDER)[number], on: boolean) {
    setDraft((d) => ({ ...d, [code]: { ...d[code], months: Array(12).fill(on) } }))
  }

  function setNote(code: (typeof PHASE_ORDER)[number], note: string) {
    setDraft((d) => ({ ...d, [code]: { ...d[code], note } }))
  }

  // Only the node's OWN calendar can be cleared; an inherited one has nothing to remove here.
  const canClear = node.calendar !== undefined

  return (
    <FieldEditorModal
      title="Calendar"
      subtitle={'Tick the months each job happens; add a note (e.g. "under glass") for the whole row.'}
      ariaLabel="Edit calendar"
      maxWidth="max-w-3xl"
      preview={<CalendarBar calendar={preview} month={CURRENT_MONTH} />}
      error={error}
      onClose={onClose}
      footer={<EditorFooter onClear={onClear} canClear={canClear} onCancel={onClose} onSave={onSave} saving={saving} saveDisabled={!dirty} />}
    >
      {/* The grid of controls: a row per phase code, a checkbox per month, then a note. */}
      <div className="overflow-x-auto">
        <div className="grid min-w-[46rem] grid-cols-[10.5rem_repeat(12,minmax(0,1fr))_9rem] items-center gap-x-1 gap-y-1">
          <div />
          {MONTH_INITIALS.map((initial, i) => (
            <div key={i} className="text-center text-[0.65rem] font-semibold uppercase tracking-wide text-subtle" title={MONTH_NAMES[i]}>
              {initial}
            </div>
          ))}
          <div className="pl-2 text-[0.65rem] font-semibold uppercase tracking-wide text-subtle">Note</div>

          {PHASE_ORDER.map((code) => {
            const allOn = draft[code].months.every(Boolean)
            return (
            <div key={code} className="contents">
              <div className="flex items-center gap-1.5 pr-2 text-sm text-muted">
                <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: tokenColour(code) }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{PHASE_META[code].label}</span>
                <button
                  type="button"
                  onClick={() => setAllMonths(code, !allOn)}
                  className="flex-none text-[0.6rem] font-medium uppercase tracking-wide text-brand-ink hover:underline"
                  title={allOn ? 'Clear every month' : 'Select every month'}
                >
                  {allOn ? 'None' : 'All'}
                </button>
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
            )
          })}
        </div>
      </div>
    </FieldEditorModal>
  )
}
