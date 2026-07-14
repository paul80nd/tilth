import type { PhaseCode } from '../schema/plant'
import type { SeasonInterest } from '../lib/calendar'
import { PHASE_META } from '../lib/calendar'
import { colourSwatch } from '../lib/colour'
import { Icon, type IconName } from './icons'

// The spreadsheet's "Colour" tab as a 2×2 year block: Spring (top-left), Summer (top-right),
// Autumn (bottom-left), Winter (bottom-right). Each season has three fixed slots — foliage,
// flower, fruit — so the eye lands in the same place every time: a tinted icon when it's on
// show (colour from the calendar's state phases), a grey dot when it isn't. Pale colours
// (white/cream) render as an outline, like the source sheet.

const PALE = /white|cream|silver|pale/i

/** The three interest slots, always rendered in this order. */
const SLOTS: PhaseCode[] = ['foliage', 'flower', 'fruit']

function Slot({ code, part }: { code: PhaseCode; part?: { colour?: string } }) {
  if (!part) {
    return (
      <span className="grid h-8 w-8 place-items-center" title={`No ${PHASE_META[code].label.toLowerCase()}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-subtle/50" aria-hidden="true" />
      </span>
    )
  }
  const hex = part.colour ? colourSwatch(part.colour) : undefined
  const pale = !!part.colour && PALE.test(part.colour)
  const filled = !!hex && !pale
  const color = pale ? 'var(--tl-border-strong)' : hex ?? 'var(--tl-text-subtle)'
  const label = PHASE_META[code].label + (part.colour ? ` — ${part.colour}` : '')
  return (
    <span className="grid h-8 w-8 place-items-center" style={{ color }} title={label}>
      <Icon name={code as IconName} filled={filled} width={26} height={26} />
    </span>
  )
}

export default function SeasonStrip({ interest }: { interest: SeasonInterest[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {interest.map((s) => (
        <div key={s.season} className="flex flex-col rounded-lg border border-line bg-card p-2">
          <div className="mb-1 text-center text-[0.65rem] font-medium uppercase tracking-wide text-subtle">
            {s.season}
          </div>
          <div className="grid flex-1 grid-cols-3 place-items-center">
            {SLOTS.map((code) => (
              <Slot key={code} code={code} part={s.parts.find((p) => p.code === code)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
