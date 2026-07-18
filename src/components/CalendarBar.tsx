import { Fragment } from 'react'
import type { PhaseCode, PhaseSpan } from '../schema/plant'
import { MONTH_INITIALS, MONTH_NAMES, PHASE_META, phasesPresent } from '../lib/calendar'

const MONTHS_H1 = [1, 2, 3, 4, 5, 6]
const MONTHS_H2 = [7, 8, 9, 10, 11, 12]

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

// The height of one month-line's coloured band strip in the compact CalendarCell.
const CAL_LANE = 18

/**
 * A compact calendar for the Taxonomy table — the 12 months on two lines of six (Jan–Jun above
 * Jul–Dec), each month a small box of stacked phase lanes: one lane per job the plant has, filled
 * in its legend colour for the months it happens. Reads like a seed-packet sow/grow/harvest strip.
 * Lanes are in PHASE_ORDER so a job keeps the same vertical position across every month, and the
 * eye can track a band left-to-right. Renders nothing when there's no calendar.
 */
export function CalendarCell({ calendar, width = 160 }: { calendar: PhaseSpan[]; width?: number }) {
  const codes = phasesPresent(calendar)
  if (codes.length === 0) return null

  const line = (months: number[], labels: string[]) => (
    <div>
      <div className="grid grid-cols-6">
        {labels.map((l, i) => (
          <div key={i} className="text-center text-[0.5rem] font-medium leading-none text-subtle">
            {l}
          </div>
        ))}
      </div>
      <div className="mt-0.5 grid grid-cols-6 overflow-hidden rounded-sm border border-divider">
        {months.map((m, i) => (
          <div key={m} className={`flex flex-col ${i > 0 ? 'border-l border-divider' : ''}`} style={{ height: CAL_LANE }}>
            {codes.map((code) => {
              const active = isActive(calendar, code, m)
              return (
                <div
                  key={code}
                  className="flex-1"
                  style={active ? { backgroundColor: tokenColour(code) } : undefined}
                  title={active ? `${PHASE_META[code].label} — ${MONTH_NAMES[m - 1]}` : undefined}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ width }} className="flex flex-col gap-1">
      {line(MONTHS_H1, MONTH_INITIALS.slice(0, 6))}
      {line(MONTHS_H2, MONTH_INITIALS.slice(6))}
    </div>
  )
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
