import type { Conditions } from '../schema/plant'
import {
  soilSet,
  phSet,
  moistureSet,
  conditionLabel,
  SOIL_TYPES,
  PH_LEVELS,
  MOISTURE_LEVELS,
  type SoilType,
  type PhLevel,
  type MoistureLevel,
} from '../lib/conditions'

// The Conditions card, split into three titled slots (Soil · Moisture · pH) like the interest
// card's quadrants. Each slot is a scannable glyph: a filled region means "grows in this", a
// muted region means "not this / not recorded". Hovering a region reveals the textual detail.
// Colours are a placeholder domain palette (earthy soils; acid/neutral/alkaline red/green/blue),
// echoing the developer's spreadsheet — a brand/dataviz pass can retune them later.

const SOIL: Record<SoilType, { label: string; name: string; fill: string; ink: string }> = {
  chalk: { label: 'Ch', name: 'Chalk', fill: '#cdcea6', ink: '#3c3d24' },
  clay: { label: 'Cl', name: 'Clay', fill: '#b57f57', ink: '#2f2013' },
  loam: { label: 'Lo', name: 'Loam', fill: '#8f8f8f', ink: '#242424' },
  sand: { label: 'Sa', name: 'Sand', fill: '#cbac83', ink: '#3a2e17' },
}

const PH: Record<PhLevel, { label: string; name: string; fill: string; ink: string }> = {
  acid: { label: 'A', name: 'Acid', fill: '#cf4a3c', ink: '#ffffff' },
  neutral: { label: 'N', name: 'Neutral', fill: '#4a9d5b', ink: '#ffffff' },
  alkaline: { label: 'K', name: 'Alkaline', fill: '#3f7bd1', ink: '#ffffff' },
}

const MOISTURE_BLUE = '#3f7bd1'
// Muted regions ("not this / not recorded") show a faint tint of their own colour — desaturated
// but still recognisable, so the eye can read what each slot *would* be. Hex alpha suffix.
const MUTED_ALPHA = '30'
const MUTED_OPACITY = 0.19

/** Soil as a 2×2 square — Chalk / Clay / Loam / Sand (reading order), filled when suitable. */
function SoilQuad({ set, size = 60 }: { set: Set<SoilType>; size?: number }) {
  return (
    <span
      className="grid grid-cols-2 gap-px overflow-hidden rounded"
      style={{ width: size, height: size, backgroundColor: 'var(--tl-surface-card)' }}
    >
      {SOIL_TYPES.map((key) => {
        const c = SOIL[key]
        const active = set.has(key)
        return (
          <span
            key={key}
            className="grid place-items-center text-xs font-bold"
            style={{
              backgroundColor: active ? c.fill : `${c.fill}${MUTED_ALPHA}`,
              color: active ? c.ink : 'var(--tl-text-subtle)',
            }}
            title={`${c.name} soil — ${active ? 'suitable' : 'not suitable'}`}
          >
            {c.label}
          </span>
        )
      })}
    </span>
  )
}

// A square split into three sectors from its centre (a "peace-sign" split): top-left, bottom,
// top-right. The boundary rays leave the centre straight up and down to the lower corners.
const WEDGE = {
  topLeft: 'M50 50 L0 79 L0 0 L50 0 Z',
  bottom: 'M50 50 L100 79 L100 100 L0 100 L0 79 Z',
  topRight: 'M50 50 L50 0 L100 0 L100 79 Z',
} as const
const WEDGE_LABEL = { topLeft: [24, 34], bottom: [50, 84], topRight: [76, 34] } as const

/** pH as a three-sector wedge — Acid (top-left) · Neutral (bottom) · Alkaline (top-right). */
function PhWedge({ set, size = 60 }: { set: Set<PhLevel>; size?: number }) {
  const cells: Array<{ pos: keyof typeof WEDGE; level: PhLevel }> = [
    { pos: 'topLeft', level: 'acid' },
    { pos: 'bottom', level: 'neutral' },
    { pos: 'topRight', level: 'alkaline' },
  ]
  return (
    <span className="block overflow-hidden rounded" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        {cells.map(({ pos, level }) => {
          const c = PH[level]
          const active = set.has(level)
          const [x, y] = WEDGE_LABEL[pos]
          return (
            <g key={level}>
              <title>{`${c.name} — ${active ? 'suitable' : 'not suitable'}`}</title>
              <path
                d={WEDGE[pos]}
                fill={c.fill}
                fillOpacity={active ? 1 : MUTED_OPACITY}
                stroke="var(--tl-surface-card)"
                strokeWidth={2.5}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={20}
                fontWeight={700}
                fill={active ? c.ink : 'var(--tl-text-subtle)'}
              >
                {c.label}
              </text>
            </g>
          )
        })}
      </svg>
    </span>
  )
}

const DROP = 'M12 3.2c3.4 4.6 5.6 7.7 5.6 10.6a5.6 5.6 0 0 1-11.2 0C6.4 10.9 8.6 7.8 12 3.2Z'

/** Moisture as a drainage scale — three droplets growing driest → wettest, filled when tolerated. */
function MoistureGauge({ set }: { set: Set<MoistureLevel> }) {
  const steps: Array<{ level: MoistureLevel; name: string; size: number }> = [
    { level: 'well-drained', name: 'Well drained', size: 22 },
    { level: 'moist', name: 'Moist', size: 30 },
    { level: 'poorly-drained', name: 'Poorly drained (wet)', size: 38 },
  ]
  return (
    <span className="flex items-end gap-1">
      {steps.map((s) => {
        const active = set.has(s.level)
        return (
          <svg
            key={s.level}
            width={s.size}
            height={s.size}
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{ color: MOISTURE_BLUE, opacity: active ? 1 : MUTED_OPACITY }}
          >
            <title>{`${s.name} — ${active ? 'yes' : 'no'}`}</title>
            <path d={DROP} fill="currentColor" />
          </svg>
        )
      })}
    </span>
  )
}

/** Comma list of the tolerated tokens, for the slot header's hover detail. */
function summary<T extends string>(order: readonly T[], set: Set<T>): string {
  const hit = order.filter((t) => set.has(t))
  return hit.length ? hit.map(conditionLabel).join(', ') : 'Not recorded'
}

export default function ConditionsCard({ conditions }: { conditions?: Conditions }) {
  const soil = soilSet(conditions?.soil)
  const ph = phSet(conditions?.ph)
  const moisture = moistureSet(conditions?.moisture)

  const slots = [
    { title: 'Soil', detail: summary(SOIL_TYPES, soil), glyph: <SoilQuad set={soil} /> },
    { title: 'Moisture', detail: summary(MOISTURE_LEVELS, moisture), glyph: <MoistureGauge set={moisture} /> },
    { title: 'pH', detail: summary(PH_LEVELS, ph), glyph: <PhWedge set={ph} /> },
  ]

  return (
    <div className="grid h-full grid-cols-3">
      {slots.map((s, i) => (
        <div
          key={s.title}
          className={`flex flex-col items-center gap-2 p-3 ${i > 0 ? 'border-l border-line' : ''}`}
        >
          <div
            className="text-[0.65rem] font-medium uppercase tracking-wide text-subtle"
            title={s.detail}
          >
            {s.title}
          </div>
          <div className="grid flex-1 place-items-center">{s.glyph}</div>
        </div>
      ))}
    </div>
  )
}
