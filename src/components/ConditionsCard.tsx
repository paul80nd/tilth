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
// card's quadrants. Each slot is a scannable square glyph: a filled region means "grows in this",
// a single uniform muted region means "not this / not recorded" — so the coloured, active regions
// read at a glance. Hovering a region reveals the textual detail. Colours are a placeholder domain
// palette (earthy soils; acid/neutral/alkaline red/green/blue; a dry→wet blue scale for moisture),
// echoing the developer's spreadsheet — a brand/dataviz pass can retune them later.

const MUTED_FILL = 'var(--tl-surface-inset)'
const MUTED_INK = 'var(--tl-text-subtle)'
// The card background shows through the gaps/strokes between regions.
const GAP = 'var(--tl-surface-card)'

type Region<T extends string> = { key: T; label: string; name: string; fill: string; ink: string }

const SOIL: Record<SoilType, Region<SoilType>> = {
  chalk: { key: 'chalk', label: 'Ch', name: 'Chalk', fill: '#cdcea6', ink: '#3c3d24' },
  clay: { key: 'clay', label: 'Cl', name: 'Clay', fill: '#b57f57', ink: '#2f2013' },
  loam: { key: 'loam', label: 'Lo', name: 'Loam', fill: '#8f8f8f', ink: '#242424' },
  sand: { key: 'sand', label: 'Sa', name: 'Sand', fill: '#cbac83', ink: '#3a2e17' },
}

// Three-sector wedges (pH, moisture) placed [top-left, bottom, top-right], reading left→right as
// the low→high end of the scale (acid→alkaline, dry→wet) with the middle value at the bottom.
type WedgePos = 'topLeft' | 'bottom' | 'topRight'

const PH: Record<WedgePos, Region<PhLevel>> = {
  topLeft: { key: 'acid', label: 'A', name: 'Acid', fill: '#cf4a3c', ink: '#ffffff' },
  bottom: { key: 'neutral', label: 'N', name: 'Neutral', fill: '#4a9d5b', ink: '#ffffff' },
  topRight: { key: 'alkaline', label: 'K', name: 'Alkaline', fill: '#3f7bd1', ink: '#ffffff' },
}

const MOISTURE: Record<WedgePos, Region<MoistureLevel>> = {
  topLeft: { key: 'well-drained', label: 'D', name: 'Well drained', fill: '#8fb8e6', ink: '#1f3552' },
  bottom: { key: 'moist', label: 'M', name: 'Moist', fill: '#4f8bd6', ink: '#ffffff' },
  topRight: { key: 'poorly-drained', label: 'W', name: 'Poorly drained (wet)', fill: '#2f66b3', ink: '#ffffff' },
}

/** Soil as a 2×2 square — Chalk / Clay / Loam / Sand (reading order), filled when suitable. */
function SoilQuad({ set, size = 60 }: { set: Set<SoilType>; size?: number }) {
  return (
    <span
      className="grid grid-cols-2 gap-px overflow-hidden rounded"
      style={{ width: size, height: size, backgroundColor: GAP }}
    >
      {SOIL_TYPES.map((key) => {
        const c = SOIL[key]
        const active = set.has(key)
        return (
          <span
            key={key}
            className="grid place-items-center text-xs font-bold"
            style={{
              backgroundColor: active ? c.fill : MUTED_FILL,
              color: active ? c.ink : MUTED_INK,
            }}
          >
            {c.label}
          </span>
        )
      })}
    </span>
  )
}

// A square split into three sectors from its centre (rays leave straight up and down to the lower
// corners): top-left, bottom, top-right.
const WEDGE: Record<WedgePos, string> = {
  topLeft: 'M50 50 L0 79 L0 0 L50 0 Z',
  bottom: 'M50 50 L100 79 L100 100 L0 100 L0 79 Z',
  topRight: 'M50 50 L50 0 L100 0 L100 79 Z',
}
const WEDGE_LABEL: Record<WedgePos, [number, number]> = {
  topLeft: [24, 34],
  bottom: [50, 80],
  topRight: [76, 34],
}
const WEDGE_ORDER: WedgePos[] = ['topLeft', 'bottom', 'topRight']

/** A three-sector wedge glyph (pH, moisture) driven by a per-position region config + active set. */
function WedgeGlyph<T extends string>({
  regions,
  set,
  size = 60,
}: {
  regions: Record<WedgePos, Region<T>>
  set: Set<T>
  size?: number
}) {
  return (
    <span className="block overflow-hidden rounded" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        {WEDGE_ORDER.map((pos) => {
          const c = regions[pos]
          const active = set.has(c.key)
          const [x, y] = WEDGE_LABEL[pos]
          return (
            <g key={pos}>
              <path
                d={WEDGE[pos]}
                fill={active ? c.fill : MUTED_FILL}
                stroke={GAP}
                strokeWidth={2.5}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={20}
                fontWeight={700}
                fill={active ? c.ink : MUTED_INK}
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

/** A whole-slot description for the hover title: "Suitable for Loam, Clay soils", or empty note. */
function describe<T extends string>(order: readonly T[], set: Set<T>): string {
  const hit = order.filter((t) => set.has(t)).map(conditionLabel)
  return hit.length ? `Suitable for ${hit.join(', ')} soils` : 'Not recorded'
}

export default function ConditionsCard({ conditions }: { conditions?: Conditions }) {
  const soil = soilSet(conditions?.soil)
  const ph = phSet(conditions?.ph)
  const moisture = moistureSet(conditions?.moisture)

  const slots = [
    { title: 'Soil', detail: describe(SOIL_TYPES, soil), glyph: <SoilQuad set={soil} /> },
    {
      title: 'Moisture',
      detail: describe(MOISTURE_LEVELS, moisture),
      glyph: <WedgeGlyph regions={MOISTURE} set={moisture} />,
    },
    { title: 'pH', detail: describe(PH_LEVELS, ph), glyph: <WedgeGlyph regions={PH} set={ph} /> },
  ]

  return (
    <div className="grid h-full grid-cols-3">
      {slots.map((s, i) => (
        <div
          key={s.title}
          className={`flex flex-col items-center gap-2 p-3 ${i > 0 ? 'border-l border-line' : ''}`}
          title={s.detail}
        >
          <div className="text-[0.65rem] font-medium uppercase tracking-wide text-subtle">
            {s.title}
          </div>
          <div className="grid flex-1 place-items-center">{s.glyph}</div>
        </div>
      ))}
    </div>
  )
}
