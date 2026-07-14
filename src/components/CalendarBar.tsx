import { Fragment } from 'react'
import type { PhaseCode, PhaseSpan } from '../schema/plant'
import { MONTH_INITIALS, MONTH_NAMES, PHASE_META, isActionable, phasesPresent } from '../lib/calendar'
import { colourSwatch } from '../lib/colour'

// The cheatsheet centrepiece: a compact 12-month × phase grid. Rows are the phases the plant
// has, columns are Jan–Dec; a filled cell means "this phase happens this month". ACTION phases
// (the jobs) use the fixed legend tokens (--tl-phase-*). STATE phases (flower/foliage/fruit)
// are drawn in their *real* colour (PhaseSpan.colour → swatch) so the chart carries the plant's
// actual seasonal colour — the calendar and the colour tab of the spreadsheet, unified. Colour
// applies inline (no dynamic Tailwind classes to purge). The current month column is marked.

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
        className="grid min-w-[32rem] items-center gap-y-0.5 text-xs"
        style={{ gridTemplateColumns: 'minmax(6rem, max-content) repeat(12, minmax(0, 1fr))' }}
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
        {codes.map((code) => {
          const dot = labelColour(calendar, code)
          return (
            <Fragment key={code}>
              <div className="flex items-center gap-1.5 pr-2 text-muted">
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
                  <div key={m} className="px-0.5">
                    <div
                      className={`h-4 rounded-sm ${fill?.pale ? 'ring-1 ring-inset ring-line-strong' : ''} ${
                        fill && isCurrent ? 'ring-2 ring-brand/70' : ''
                      }`}
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

      {/* legend — the actionable jobs (fixed colours). State phases read in their real colour
          and are named by their row label + the seasonal strip. */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {codes.filter(isActionable).map((code) => (
          <span key={code} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: `var(--tl-phase-${PHASE_META[code].token})` }}
              aria-hidden="true"
            />
            {PHASE_META[code].label}
          </span>
        ))}
      </div>
    </div>
  )
}
