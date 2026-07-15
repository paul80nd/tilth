import type { PhaseCode } from '../schema/plant'
import type { SeasonInterest } from '../lib/calendar'
import { PHASE_META } from '../lib/calendar'
import { colourSwatch } from '../lib/colour'
import { SeasonalIcon } from './icons'

// The spreadsheet's "Colour" tab as a compact horizontal strip: four season columns left→right
// (Spring · Summer · Autumn · Winter), each with a 2×2 block of fixed interest slots — foliage,
// flower, fruit, stem — so the eye lands in the same place every time: a tinted icon when it's on
// show (colour from the calendar's state phases), a grey dot when it isn't. Pale colours
// (white/cream) render as an outline, like the source sheet. Shaped to share a row with Position +
// Conditions; the 2×2 (vs a stack) keeps it short enough to match their height.

const PALE = /white|cream|silver|pale/i

// The four interest slots as a 2×2, reading TL→TR→BL→BR: foliage · flower / stem · fruit — i.e.
// clockwise from top-left, leaf → flower → fruit → stem.
const SLOTS: PhaseCode[] = ['foliage', 'flower', 'stem', 'fruit']

function Slot({ code, part }: { code: PhaseCode; part?: { colour?: string } }) {
  if (!part) {
    return (
      <span className="grid h-7 w-7 place-items-center" title={`No ${PHASE_META[code].label.toLowerCase()}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-subtle/50" aria-hidden="true" />
      </span>
    )
  }
  // Bold silhouette tinted to the part's real colour; pale blooms (white/cream) fall back to a
  // light neutral so they stay legible in both themes.
  const hex = part.colour ? colourSwatch(part.colour) : undefined
  const pale = !!part.colour && PALE.test(part.colour)
  const color = pale ? 'var(--tl-border-strong)' : hex ?? 'var(--tl-text-subtle)'
  const label = PHASE_META[code].label + (part.colour ? ` — ${part.colour}` : '')
  return (
    <span className="grid h-7 w-7 place-items-center" style={{ color }} title={label}>
      <SeasonalIcon part={code as 'foliage' | 'flower' | 'fruit' | 'stem'} size={22} />
    </span>
  )
}

export default function SeasonStrip({ interest }: { interest: SeasonInterest[] }) {
  // Four season columns split by hairline dividers; each holds a 2×2 of interest slots. The
  // enclosing tile frames it.
  return (
    <div className="grid h-full grid-cols-4">
      {interest.map((s, i) => (
        <div
          key={s.season}
          className={`flex flex-col items-center gap-1 p-2 ${i > 0 ? 'border-l border-line' : ''}`}
        >
          <div className="text-[0.6rem] font-medium uppercase tracking-wide text-subtle">
            {s.season}
          </div>
          <div className="grid flex-1 grid-cols-2 place-content-center">
            {SLOTS.map((code) => (
              <Slot key={code} code={code} part={s.parts.find((p) => p.code === code)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
