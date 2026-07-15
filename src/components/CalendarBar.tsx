import { Fragment } from 'react'
import type { PhaseCode, PhaseSpan } from '../schema/plant'
import { MONTH_INITIALS, MONTH_NAMES, PHASE_META, isActionable, phasesPresent } from '../lib/calendar'
import { colourSwatch } from '../lib/colour'

// The cheatsheet centrepiece: a compact 12-month × phase grid, held in a card that matches the
// seasonal-interest block. Rows are the phases the plant has, columns are Jan–Dec split by
// hairline dividers so the card reads as a month grid; a filled cell means "this phase happens
// this month". Cells fill edge-to-edge, so a run of months forms one continuous band (touching,
// not rounded islands). ACTION phases (the jobs) use the fixed legend tokens (--tl-phase-*).
// STATE phases (flower/foliage/fruit) are drawn in their *real* colour (PhaseSpan.colour →
// swatch) so the chart carries the plant's actual seasonal colour — the calendar and the colour
// tab of the spreadsheet, unified. Colour applies inline (no dynamic Tailwind classes to purge).
// No bottom legend: each row is named by its own label + coloured dot on the left. The current
// month column is tinted and its header marked.

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const PALE = /white|cream|silver|pale/i

/** The fill for a (code, month) cell, or null if the phase isn't active that month. */
function cellFill(
  calendar: PhaseSpan[],
  code: PhaseCode,
  month: number,
): { colour: string; pale: boolean } | null {
  const span = calendar.find((s) => s.code === code && s.months.includes(month))
  if (!span) return null
  const legend = `var(--tl-phase-${PHASE_META[code].token})`
  if (isActionable(code)) return { colour: legend, pale: false }
  const hex = span.colour ? colourSwatch(span.colour) : undefined
  return { colour: hex ?? legend, pale: !!span.colour && PALE.test(span.colour) }
}

/** A representative colour for the row's label dot. */
function labelColour(calendar: PhaseSpan[], code: PhaseCode): { colour: string; pale: boolean } {
  const legend = `var(--tl-phase-${PHASE_META[code].token})`
  if (isActionable(code)) return { colour: legend, pale: false }
  const withColour = calendar.find((s) => s.code === code && s.colour)?.colour
  const hex = withColour ? colourSwatch(withColour) : undefined
  return { colour: hex ?? legend, pale: !!withColour && PALE.test(withColour) }
}

function noteFor(calendar: PhaseSpan[], code: PhaseCode, month: number): string | undefined {
  return calendar.find((s) => s.code === code && s.months.includes(month) && s.note)?.note
}

export default function CalendarBar({ calendar, month }: { calendar: PhaseSpan[]; month: number }) {
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
          {/* header row: month initials, current month marked */}
          <div className="py-2" />
          {MONTH_INITIALS.map((initial, i) => (
            <div
              key={i}
              className={`border-l border-line py-2 text-center ${
                i + 1 === month ? 'bg-brand/10 font-bold text-brand-ink' : 'font-medium text-subtle'
              }`}
              title={i + 1 === month ? `${MONTH_NAMES[i]} (this month)` : MONTH_NAMES[i]}
            >
              {initial}
            </div>
          ))}

          {/* one row per present phase; cells fill edge-to-edge so runs form continuous bands */}
          {codes.map((code, rowIdx) => {
            const dot = labelColour(calendar, code)
            const rowLine = rowIdx > 0 ? 'border-t border-line' : ''
            return (
              <Fragment key={code}>
                <div className={`flex items-center gap-1.5 py-1.5 pl-3 pr-2 text-muted ${rowLine}`}>
                  <span
                    className={`h-2.5 w-2.5 flex-none rounded-full ${dot.pale ? 'ring-1 ring-line-strong' : ''}`}
                    style={{ backgroundColor: dot.colour }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{PHASE_META[code].label}</span>
                </div>
                {MONTHS.map((m) => {
                  const fill = cellFill(calendar, code, m)
                  const isCurrent = m === month
                  return (
                    <div
                      key={m}
                      className={`border-l border-line ${rowLine} ${
                        !fill && isCurrent ? 'bg-brand/10' : ''
                      }`}
                    >
                      <div
                        className={`h-full min-h-[1.4rem] w-full ${fill?.pale ? 'ring-1 ring-inset ring-line-strong' : ''}`}
                        style={fill ? { backgroundColor: fill.colour } : undefined}
                        title={
                          fill
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
