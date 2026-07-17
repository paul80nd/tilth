import { Fragment } from 'react'
import type { PhaseCode, PhaseSpan } from '../schema/plant'
import { MONTH_INITIALS, MONTH_NAMES, PHASE_META, phasesPresent } from '../lib/calendar'

// The cheatsheet centrepiece: a compact 12-month × phase grid, held in a card that matches the
// seasonal-interest block. Rows are the jobs the plant has, columns are Jan–Dec split by
// hairline dividers so the card reads as a month grid; a filled cell means "this job happens
// this month". Cells fill edge-to-edge, so a run of months forms one continuous band (touching,
// not rounded islands). Every phase is a job, coloured by its fixed legend token (--tl-phase-*);
// ornamental interest is a separate strip, not shown here. No bottom legend: each row is named by
// its own label + coloured dot on the left. The current month column is tinted and its header marked.

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/** The legend colour for a phase code. */
function tokenColour(code: PhaseCode): string {
  return `var(--tl-phase-${PHASE_META[code].token})`
}

/** True if the phase is active in the month. */
function isActive(calendar: PhaseSpan[], code: PhaseCode, month: number): boolean {
  return calendar.some((s) => s.code === code && s.months.includes(month))
}

function noteFor(calendar: PhaseSpan[], code: PhaseCode, month: number): string | undefined {
  return calendar.find((s) => s.code === code && s.months.includes(month) && s.note)?.note
}

export default function CalendarBar({
  calendar,
  month,
  note,
}: {
  calendar: PhaseSpan[]
  month: number
  /** Inherited-source note (e.g. "from Apple"), shown in the otherwise-empty top-left cell. */
  note?: string
}) {
  const codes = phasesPresent(calendar)
  if (codes.length === 0) {
    return <p className="text-sm text-muted">No calendar recorded for this plant yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[30rem] text-xs"
        style={{ gridTemplateColumns: 'minmax(5.5rem, max-content) repeat(12, minmax(0, 1fr))' }}
      >
          {/* header row: the top-left cell carries any inherited-source note; then month initials */}
          <div className="flex items-end py-1.5 pl-3 pr-2">
            {note && <span className="text-[0.6rem] italic leading-tight text-subtle">{note}</span>}
          </div>
          {MONTH_INITIALS.map((initial, i) => (
            <div
              key={i}
              className={`border-l border-line py-1.5 text-center ${
                i + 1 === month ? 'bg-brand/10 font-bold text-brand-ink' : 'font-medium text-subtle'
              }`}
              title={i + 1 === month ? `${MONTH_NAMES[i]} (this month)` : MONTH_NAMES[i]}
            >
              {initial}
            </div>
          ))}

          {/* one row per present phase; cells fill edge-to-edge so runs form continuous bands */}
          {codes.map((code, rowIdx) => {
            const colour = tokenColour(code)
            const rowLine = rowIdx > 0 ? 'border-t border-line' : ''
            return (
              <Fragment key={code}>
                <div className={`flex items-center gap-1.5 py-1 pl-3 pr-2 text-muted ${rowLine}`}>
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ backgroundColor: colour }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{PHASE_META[code].label}</span>
                </div>
                {MONTHS.map((m) => {
                  const active = isActive(calendar, code, m)
                  const isCurrent = m === month
                  return (
                    <div
                      key={m}
                      className={`border-l border-line ${rowLine} ${
                        !active && isCurrent ? 'bg-brand/10' : ''
                      }`}
                    >
                      <div
                        className="h-full min-h-[1.15rem] w-full"
                        style={active ? { backgroundColor: colour } : undefined}
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
            )
          })}
      </div>
    </div>
  )
}
