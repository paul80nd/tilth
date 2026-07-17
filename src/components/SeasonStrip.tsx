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

const ICON = 30

/** Tint for a colour word: pale blooms (white/cream) fall back to a fixed light neutral so they
 *  read as "pale" on both a white and a dark card (a theme-flipping token would go dark in dark
 *  mode and vanish); unknown words render subtle. */
function tint(colour?: string): string {
  if (!colour) return 'var(--tl-text-subtle)'
  if (PALE.test(colour)) return 'var(--tl-neutral-300)'
  return colourSwatch(colour) ?? 'var(--tl-text-subtle)'
}

// Where a ray from the box centre (at `deg` clockwise from 12 o'clock) crosses the 0–100 box.
function edge(deg: number): [number, number] {
  const r = (deg * Math.PI) / 180
  const dx = Math.sin(r)
  const dy = -Math.cos(r)
  const ts: number[] = []
  if (Math.abs(dx) > 1e-6) ts.push((dx > 0 ? 50 : -50) / dx)
  if (Math.abs(dy) > 1e-6) ts.push((dy > 0 ? 50 : -50) / dy)
  const t = Math.min(...ts.filter((v) => v > 0))
  return [50 + t * dx, 50 + t * dy]
}

// clip-path polygons dividing the box into N equal pie sectors, clockwise from 12 o'clock — so a
// single silhouette can be painted in N hard-edged colour wedges (a conic split SVG fill can't do).
function sectorClips(n: number): string[] {
  const CORNERS: Array<[number, [number, number]]> = [
    [45, [100, 0]], [135, [100, 100]], [225, [0, 100]], [315, [0, 0]],
  ]
  const fmt = ([x, y]: [number, number]) => `${Math.round(x)}% ${Math.round(y)}%`
  const step = 360 / n
  return Array.from({ length: n }, (_, i) => {
    const a0 = i * step
    const a1 = (i + 1) * step
    const pts = ['50% 50%', fmt(edge(a0))]
    for (const [ca, pt] of CORNERS) if (ca > a0 && ca < a1) pts.push(fmt(pt))
    pts.push(fmt(edge(a1)))
    return `polygon(${pts.join(', ')})`
  })
}

function Slot({ code, part }: { code: PhaseCode; part?: { colours: string[] } }) {
  const iconPart = code as 'foliage' | 'flower' | 'fruit' | 'stem'
  if (!part) {
    return (
      <span className="grid h-9 w-9 place-items-center" title={`No ${PHASE_META[code].label.toLowerCase()}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-subtle/50" aria-hidden="true" />
      </span>
    )
  }
  const label = PHASE_META[code].label + (part.colours.length ? ` — ${part.colours.join(', ')}` : '')

  // 0–1 colour: a single tinted silhouette. 2+: the same silhouette painted in hard conic wedges,
  // one colour per equal sector (1st third / 2nd third / 3rd third), like a segmented swatch.
  if (part.colours.length <= 1) {
    return (
      <span className="grid h-9 w-9 place-items-center" style={{ color: tint(part.colours[0]) }} title={label}>
        <SeasonalIcon part={iconPart} size={ICON} />
      </span>
    )
  }
  const n = part.colours.length
  const clips = sectorClips(n)
  const step = 360 / n
  return (
    <span className="grid h-9 w-9 place-items-center" title={label}>
      <span className="relative block" style={{ width: ICON, height: ICON }}>
        {part.colours.map((c, i) => (
          <span
            key={c}
            className="absolute inset-0 grid place-items-center"
            style={{ color: tint(c), clipPath: clips[i] }}
          >
            <SeasonalIcon part={iconPart} size={ICON} />
          </span>
        ))}
        {/* Hairline between wedges: a thin radial line in the card colour, so it reads as a clean
            cut across the silhouette and stays invisible where it overshoots into empty space. */}
        {part.colours.map((_, i) => (
          <span
            key={`edge-${i}`}
            aria-hidden="true"
            className="absolute left-1/2 top-1/2"
            style={{
              height: ICON,
              width: 1.5,
              background: 'var(--tl-surface-card)',
              transformOrigin: 'bottom center',
              transform: `translate(-50%, -100%) rotate(${step * i}deg)`,
            }}
          />
        ))}
      </span>
    </span>
  )
}

/** One season's interest as a 2×2 of slots (foliage · flower / stem · fruit). Reused by the strip
 *  and, edge-to-edge, as a compare-table cell. */
export function SeasonCell({ parts, className = '' }: { parts: SeasonInterest['parts']; className?: string }) {
  return (
    <div className={`grid grid-cols-2 place-content-center ${className}`}>
      {SLOTS.map((code) => (
        <Slot key={code} code={code} part={parts.find((p) => p.code === code)} />
      ))}
    </div>
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
          <SeasonCell parts={s.parts} className="flex-1" />
        </div>
      ))}
    </div>
  )
}
