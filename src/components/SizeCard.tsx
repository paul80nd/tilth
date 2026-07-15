import type { Size } from '../schema/plant'
import { parseLength, type MetreRange } from '../lib/size'
import { Icon } from './icons'

// The Size card as a to-scale scene: the plant drawn at its ultimate height × spread beside a
// human figure (1.8m) for instant sense of scale, over subtle metre gridlines. The view scales so
// the taller of plant/human fills the frame (capped at 12m — taller plants show "↑"), so a 20cm
// herb and an 8m tree both read true; the silhouette grows a trunk as height increases. A compact
// fixed-height scene keeps it from dominating. Illustrative palette — a brand pass can retune it.

const CANOPY = '#6aa564'
const BARK = '#7c5a3b'

// viewBox geometry (the SVG scales to the card; ground stays at the bottom). Kept short so the
// scene is compact.
const W = 240
const H = 128
const GROUND_Y = 110
const TOP_PAD = 8
const DRAWABLE = GROUND_Y - TOP_PAD
const HUMAN_M = 1.8
const CAP_M = 12
const HUMAN_X = 40
const PLANT_X = 158
const MAX_CANOPY = 150

/** A simple human figure (head, torso, arms, legs), feet on the ground, `h` px tall. */
function Human({ h }: { h: number }) {
  const cx = HUMAN_X
  const base = GROUND_Y
  const r = h * 0.085
  const headCy = base - h + r
  const shoulderY = headCy + r + h * 0.03
  const hipY = base - h * 0.46
  const stroke = 'var(--tl-text-subtle)'
  return (
    <g stroke={stroke} fill={stroke} opacity={0.75} strokeLinecap="round">
      <circle cx={cx} cy={headCy} r={r} stroke="none" />
      {/* torso */}
      <line x1={cx} y1={shoulderY} x2={cx} y2={hipY} strokeWidth={h * 0.12} />
      {/* arms */}
      <line x1={cx} y1={shoulderY + h * 0.02} x2={cx - h * 0.14} y2={hipY - h * 0.02} strokeWidth={h * 0.07} />
      <line x1={cx} y1={shoulderY + h * 0.02} x2={cx + h * 0.14} y2={hipY - h * 0.02} strokeWidth={h * 0.07} />
      {/* legs */}
      <line x1={cx} y1={hipY} x2={cx - h * 0.08} y2={base} strokeWidth={h * 0.08} />
      <line x1={cx} y1={hipY} x2={cx + h * 0.08} y2={base} strokeWidth={h * 0.08} />
    </g>
  )
}

/** The plant silhouette: a mound canopy (width = spread) that grows a trunk as it gets taller. */
function Plant({ hPx, canopyW, heightM }: { hPx: number; canopyW: number; heightM: number }) {
  const trunkFrac = heightM > 2.5 ? 0.32 : heightM > 1.2 ? 0.14 : 0
  const trunkH = hPx * trunkFrac
  const base = GROUND_Y - trunkH
  const canopyH = hPx - trunkH
  const top = base - canopyH
  const hw = canopyW / 2
  const trunkW = Math.max(3, canopyW * 0.1)
  return (
    <g>
      {trunkH > 0 && (
        <rect x={PLANT_X - trunkW / 2} y={base - 1} width={trunkW} height={trunkH + 1} fill={BARK} rx={1} />
      )}
      <path
        d={`M${PLANT_X - hw} ${base} C${PLANT_X - hw} ${base - canopyH * 1.15} ${PLANT_X - hw * 0.4} ${top} ${PLANT_X} ${top} C${PLANT_X + hw * 0.4} ${top} ${PLANT_X + hw} ${base - canopyH * 1.15} ${PLANT_X + hw} ${base} Z`}
        fill={CANOPY}
      />
    </g>
  )
}

function Fact({ icon, children }: { icon: 'height' | 'spread' | 'time'; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted">
      <span className="text-brand-ink">
        <Icon name={icon} width={15} height={15} />
      </span>
      {children}
    </span>
  )
}

export default function SizeCard({ size }: { size?: Size }) {
  const h: MetreRange | undefined = parseLength(size?.height)
  const s: MetreRange | undefined = parseLength(size?.spread)

  if (!h) {
    return <p className="p-4 text-sm text-muted">Not recorded yet.</p>
  }

  const overCap = h.max > CAP_M || h.openEnded
  const drawH = Math.min(h.max, CAP_M)
  const viewM = Math.min(Math.max(drawH, HUMAN_M), CAP_M)
  const scale = DRAWABLE / viewM

  const plantPx = drawH * scale
  const humanPx = HUMAN_M * scale
  const canopyW = Math.min((s?.max ?? h.max * 0.6) * scale, MAX_CANOPY)

  const step = Math.ceil(viewM / 6)
  const ticks: number[] = []
  for (let m = step; m <= viewM; m += step) ticks.push(m)

  return (
    <div className="flex flex-col">
      <div className="h-32">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax meet" className="h-full w-full">
          {/* metre gridlines + labels */}
          {ticks.map((m) => {
            const y = GROUND_Y - m * scale
            return (
              <g key={m}>
                <line x1={13} y1={y} x2={W - 8} y2={y} stroke="var(--tl-border)" strokeWidth={1} strokeDasharray="2 3" />
                <text x={4} y={y + 3} fontSize={9} fill="var(--tl-text-subtle)">
                  {m}
                </text>
              </g>
            )
          })}

          {/* ground */}
          <line x1={8} y1={GROUND_Y} x2={W - 8} y2={GROUND_Y} stroke="var(--tl-border-strong)" strokeWidth={1.5} />

          <Human h={humanPx} />
          <Plant hPx={plantPx} canopyW={canopyW} heightM={drawH} />

          {/* "taller than the frame" marker for trees beyond the cap */}
          {overCap && (
            <text x={PLANT_X} y={TOP_PAD} fontSize={12} fontWeight={700} fill={CANOPY} textAnchor="middle">
              ↑
            </text>
          )}
        </svg>
      </div>

      {/* labels */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-2 text-xs">
        <Fact icon="height">{size?.height}</Fact>
        {size?.spread && <Fact icon="spread">{size.spread}</Fact>}
        {size?.timeToSize && <Fact icon="time">{size.timeToSize}</Fact>}
      </div>
    </div>
  )
}
