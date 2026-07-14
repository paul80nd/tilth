import type { PhaseCode } from '../schema/plant'
import type { SeasonInterest } from '../lib/calendar'
import { PHASE_META } from '../lib/calendar'
import { colourSwatch } from '../lib/colour'
import { Icon, type IconName } from './icons'

// The spreadsheet's "Colour" tab: for each season, the foliage/flower/fruit on show and in what
// colour, as tinted icons. Derived from the calendar's state phases (so colour can vary by
// season). Pale colours (white/cream) render as an outline, like the source sheet.

const PALE = /white|cream|silver|pale/i

function InterestIcon({ code, colour }: { code: PhaseCode; colour?: string }) {
  const hex = colour ? colourSwatch(colour) : undefined
  const pale = !!colour && PALE.test(colour)
  const filled = !!hex && !pale
  const color = pale ? 'var(--tl-border-strong)' : hex ?? 'var(--tl-text-subtle)'
  const label = PHASE_META[code].label + (colour ? ` — ${colour}` : '')
  return (
    <span title={label} style={{ color }} className="inline-flex">
      <Icon name={code as IconName} filled={filled} width={22} height={22} />
    </span>
  )
}

export default function SeasonStrip({ interest }: { interest: SeasonInterest[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {interest.map((s) => (
        <div key={s.season} className="rounded-lg border border-line bg-card p-3 text-center">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
            {s.season}
          </div>
          <div className="flex min-h-7 flex-wrap items-center justify-center gap-1.5">
            {s.parts.length > 0 ? (
              s.parts.map((p, i) => <InterestIcon key={`${p.code}-${i}`} code={p.code} colour={p.colour} />)
            ) : (
              <span className="text-subtle">–</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
