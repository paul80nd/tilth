import type { Position } from '../schema/plant'
import {
  lightSet,
  lightLevel,
  aspectSet,
  exposureSet,
  exposureLevel,
  hardiness,
  conditionLabel,
  CARDINALS,
  HARDINESS_MAX,
  type Cardinal,
  type Exposure,
} from '../lib/conditions'

// The Position card — four scannable slots (Light · Aspect · Exposure · Hardiness) that answer the
// same questions in the same place for every plant, mirroring the Conditions card's grammar (title ·
// glyph · hover detail). Presentation only; values come from the resolved node. Colours are a
// placeholder domain palette (a warm sun, a directional green, a breezy blue, a tender→cold ramp) —
// a brand/dataviz pass can retune them later.

const MUTED_FILL = 'var(--tl-surface-inset)'
const MUTED_INK = 'var(--tl-text-subtle)'
const GOLD = '#f2b134' // full sun
const FACE = '#6aa564' // a faced compass sector
const WIND = '#5f93c0' // an exposed / windy site
const HEDGE = '#6f9e58' // a shelter

// ── Light ────────────────────────────────────────────────────────────────────────────────────────

// The sun glyph — IconPark "sunny" (ByteDance, Apache-2.0; see CREDITS.md), recoloured. Drawn twice
// under left/right clips so a half-gold / half-muted disc reads as "full sun to partial shade".
function SunArt({ color }: { color: string }) {
  return (
    <g fill="none" stroke={color} strokeLinejoin="round" strokeWidth={4}>
      <path
        strokeLinecap="round"
        d="m9.15 9.15l2.228 2.228M3 24h3.15m3 14.85l2.228-2.228M38.85 38.85l-2.228-2.228M45 24h-3.15m-3-14.85l-2.228 2.228M24 3v3.15"
      />
      <path fill={color} d="M24 36c6.627 0 12-5.373 12-12s-5.373-12-12-12s-12 5.373-12 12s5.373 12 12 12Z" />
      <path strokeLinecap="round" d="M24 45v-3.15" />
    </g>
  )
}

function SunGlyph({ level, size = 52 }: { level: ReturnType<typeof lightLevel>; size?: number }) {
  if (!level) {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} opacity={0.4} aria-hidden="true">
        <SunArt color={MUTED_INK} />
      </svg>
    )
  }
  if (level === 'partial') {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <defs>
          <clipPath id="sun-left">
            <rect x={0} y={0} width={24} height={48} />
          </clipPath>
          <clipPath id="sun-right">
            <rect x={24} y={0} width={24} height={48} />
          </clipPath>
        </defs>
        <g clipPath="url(#sun-left)">
          <SunArt color={GOLD} />
        </g>
        <g clipPath="url(#sun-right)">
          <SunArt color={MUTED_INK} />
        </g>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <SunArt color={level === 'full' ? GOLD : MUTED_INK} />
    </svg>
  )
}

// ── Aspect ───────────────────────────────────────────────────────────────────────────────────────

const CX = 50
const CY = 50
const R = 42

/** A point on the compass rim at `deg` clockwise from north (0° = up, 90° = right). */
function rim(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CX + R * Math.sin(rad), CY - R * Math.cos(rad)]
}

/** A 90° pie sector centred on a cardinal bearing (N = 0°, E = 90°, …). */
function sector(bearing: number): string {
  const [x1, y1] = rim(bearing - 45)
  const [x2, y2] = rim(bearing + 45)
  return `M${CX} ${CY} L${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2} Z`
}

const BEARING: Record<Cardinal, number> = { north: 0, east: 90, south: 180, west: 270 }

function CompassGlyph({ set, size = 52 }: { set: Set<Cardinal>; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx={CX} cy={CY} r={R} fill={MUTED_FILL} />
      {CARDINALS.map((c) => set.has(c) && <path key={c} d={sector(BEARING[c])} fill={FACE} />)}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--tl-border-strong)" strokeWidth={2} />
      <text x={CX} y={15} textAnchor="middle" fontSize={17} fontWeight={700} fill={MUTED_INK}>
        N
      </text>
    </svg>
  )
}

// ── Exposure ─────────────────────────────────────────────────────────────────────────────────────

// A wind streak with a small trailing curl (echoes the "breeze" icon idiom).
function Streak({ y, x1, x2, color, w }: { y: number; x1: number; x2: number; color: string; w: number }) {
  return (
    <path
      d={`M${x1} ${y} H${x2} a6 6 0 1 1-6 6`}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
    />
  )
}

function ExposureGlyph({ level, size = 52 }: { level: ReturnType<typeof exposureLevel>; size?: number }) {
  const windy = level === 'exposed'
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" opacity={level ? 1 : 0.4}>
      {windy ? (
        // Open site: long gusts sweeping right across the frame.
        <g>
          <Streak y={32} x1={12} x2={74} color={WIND} w={7} />
          <Streak y={52} x1={12} x2={84} color={WIND} w={7} />
          <Streak y={72} x1={12} x2={66} color={WIND} w={7} />
        </g>
      ) : (
        // Sheltered: a low hedge/wall stops short, faint gusts.
        <g>
          <Streak y={34} x1={44} x2={80} color={MUTED_INK} w={6} />
          <Streak y={70} x1={44} x2={74} color={MUTED_INK} w={6} />
          <rect x={22} y={30} width={16} height={52} rx={8} fill={HEDGE} />
        </g>
      )}
    </svg>
  )
}

// ── Hardiness ────────────────────────────────────────────────────────────────────────────────────

// Tender → very hardy ramp (warm orange → cold blue), one colour per H1…H7 step.
const HARDINESS_RAMP = ['#e07a3f', '#e8973f', '#e6bf3f', '#9fbf4f', '#5fae7a', '#4a93b8', '#3f6fd1']

function HardinessGlyph({ rank, label }: { rank: number; label: string }) {
  const bars = HARDINESS_MAX
  const bw = 11
  const gap = 2.5
  const totalW = bars * bw + (bars - 1) * gap
  const x0 = (100 - totalW) / 2
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 56" width={56} height={31} aria-hidden="true">
        {Array.from({ length: bars }, (_, i) => {
          const n = i + 1
          const filled = n <= rank
          const h = 14 + (i / (bars - 1)) * 38 // increasing height, tender → hardy
          const x = x0 + i * (bw + gap)
          return (
            <rect
              key={n}
              x={x}
              y={54 - h}
              width={bw}
              height={h}
              rx={1.5}
              fill={filled ? HARDINESS_RAMP[i] : MUTED_FILL}
              stroke={n === rank ? 'var(--tl-text)' : 'none'}
              strokeWidth={n === rank ? 2 : 0}
            />
          )
        })}
      </svg>
      <span className="text-sm font-bold leading-none">{label}</span>
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────────────────────────

function faceLabel(set: Set<Cardinal>): string {
  const hit = CARDINALS.filter((c) => set.has(c))
  if (!hit.length) return 'Aspect not recorded'
  return `Faces ${hit.map((c) => c[0].toUpperCase()).join(' / ')}`
}

function lightLabel(set: Set<string>): string {
  const hit = [...set].map(conditionLabel)
  return hit.length ? hit.join(', ') : 'Light not recorded'
}

function exposureLabel(set: Set<Exposure>): string {
  if (set.has('sheltered') && set.has('exposed')) return 'Any — sheltered or exposed'
  const hit = [...set].map(conditionLabel)
  return hit.length ? hit.join(', ') : 'Exposure not recorded'
}

// Single-facet cells for the compare table — the same glyphs, sized to fill a table square.
export function LightCell({ position, size }: { position?: Position; size?: number }) {
  return <SunGlyph level={lightLevel(lightSet(position?.sun))} size={size} />
}
export function AspectCell({ position, size }: { position?: Position; size?: number }) {
  return <CompassGlyph set={aspectSet(position?.aspect)} size={size} />
}
export function ExposureCell({ position, size }: { position?: Position; size?: number }) {
  return <ExposureGlyph level={exposureLevel(exposureSet(position?.exposure))} size={size} />
}
export function HardinessCell({ position }: { position?: Position }) {
  const hardy = hardiness(position?.hardiness)
  return hardy ? <HardinessGlyph rank={hardy.rank} label={hardy.label} /> : <span className="text-sm text-subtle">—</span>
}

export default function PositionCard({ position }: { position?: Position }) {
  const light = lightSet(position?.sun)
  const aspect = aspectSet(position?.aspect)
  const exposure = exposureSet(position?.exposure)
  const hardy = hardiness(position?.hardiness)

  const slots = [
    { title: 'Light', detail: lightLabel(light), glyph: <SunGlyph level={lightLevel(light)} /> },
    { title: 'Aspect', detail: faceLabel(aspect), glyph: <CompassGlyph set={aspect} /> },
    {
      title: 'Exposure',
      detail: exposureLabel(exposure),
      glyph: <ExposureGlyph level={exposureLevel(exposure)} />,
    },
    {
      title: 'Hardiness',
      detail: hardy
        ? `Hardiness ${hardy.label} — higher ratings withstand colder winters (H1 tender → H7 very hardy).`
        : 'Hardiness not recorded',
      glyph: hardy ? (
        <HardinessGlyph rank={hardy.rank} label={hardy.label} />
      ) : (
        <span className="text-sm text-subtle">—</span>
      ),
    },
  ]

  return (
    <div className="grid h-full grid-cols-4">
      {slots.map((s, i) => (
        <div
          key={s.title}
          className={`flex flex-col items-center gap-2 p-2 ${i > 0 ? 'border-l border-line' : ''}`}
          title={s.detail}
        >
          <div className="text-[0.6rem] font-medium uppercase tracking-wide text-subtle">{s.title}</div>
          <div className="grid flex-1 place-items-center">{s.glyph}</div>
        </div>
      ))}
    </div>
  )
}
