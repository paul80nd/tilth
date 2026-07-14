import { Fragment } from 'react'
import type { PhaseCode, PhaseSpan } from '../schema/plant'
import {
  MONTH_INITIALS,
  MONTH_NAMES,
  PHASE_META,
  isActionable,
  phasesPresent,
} from '../lib/calendar'

// The cheatsheet centrepiece: a 12-month × phase grid. Rows are the phases the plant has,
// columns are Jan–Dec; a filled cell means "this phase happens this month". Colour comes from
// the phase legend tokens (--tl-phase-*) via inline style — no stored colours, and no dynamic
// Tailwind class names to purge. Actionable phases (jobs) read saturated; state phases
// (flower/foliage/fruit) are the quieter background band. The current month column is marked.

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function phaseVar(code: PhaseCode): string {
  return `var(--tl-phase-${PHASE_META[code].token})`
}

/** Map each present code to the set of months it covers (spans of the same code union). */
function monthsByCode(calendar: PhaseSpan[]): Map<PhaseCode, Set<number>> {
  const map = new Map<PhaseCode, Set<number>>()
  for (const span of calendar) {
    const set = map.get(span.code) ?? new Set<number>()
    span.months.forEach((m) => set.add(m))
    map.set(span.code, set)
  }
  return map
}

/** Collect any per-span notes for a code, for the cell tooltip. */
function noteFor(calendar: PhaseSpan[], code: PhaseCode, month: number): string | undefined {
  return calendar.find((s) => s.code === code && s.months.includes(month) && s.note)?.note
}

export default function CalendarBar({
  calendar,
  month,
}: {
  calendar: PhaseSpan[]
  month: number
}) {
  const codes = phasesPresent(calendar)
  if (codes.length === 0) {
    return <p className="text-sm text-muted">No calendar recorded for this plant yet.</p>
  }
  const covered = monthsByCode(calendar)

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[32rem] items-center gap-y-1 text-xs"
        style={{ gridTemplateColumns: 'minmax(6.5rem, max-content) repeat(12, minmax(0, 1fr))' }}
      >
        {/* header row */}
        <div />
        {MONTH_INITIALS.map((initial, i) => (
          <div
            key={i}
            className={`px-1 text-center ${
              i + 1 === month
                ? 'font-bold text-brand-ink underline decoration-brand/50 underline-offset-4'
                : 'font-medium text-subtle'
            }`}
            title={i + 1 === month ? `${MONTH_NAMES[i]} (this month)` : MONTH_NAMES[i]}
          >
            {initial}
          </div>
        ))}

        {/* one row per present phase */}
        {codes.map((code) => (
          <Fragment key={code}>
            <div className="flex items-center gap-1.5 pr-2 text-muted">
              <span
                className="h-2.5 w-2.5 flex-none rounded-full"
                style={{ backgroundColor: phaseVar(code) }}
                aria-hidden="true"
              />
              <span className="truncate">{PHASE_META[code].label}</span>
            </div>
            {MONTHS.map((m) => {
              const active = covered.get(code)?.has(m)
              const isCurrent = m === month
              return (
                <div key={m} className="px-0.5">
                  <div
                    className={`h-5 rounded-sm ${
                      active && isCurrent ? 'ring-2 ring-brand/70' : ''
                    }`}
                    style={active ? { backgroundColor: phaseVar(code) } : undefined}
                    title={
                      active
                        ? `${PHASE_META[code].label} — ${MONTH_NAMES[m - 1]}${
                            noteFor(calendar, code, m) ? ` (${noteFor(calendar, code, m)})` : ''
                          }`
                        : undefined
                    }
                  />
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {codes.map((code) => (
          <span key={code} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: phaseVar(code) }}
              aria-hidden="true"
            />
            {PHASE_META[code].label}
            {!isActionable(code) && <span className="text-subtle">(display)</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
