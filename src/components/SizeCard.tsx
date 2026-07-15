import type { Size } from '../schema/plant'
import { parseLength, type MetreRange } from '../lib/size'
import { Icon } from './icons'

// The Size card as a to-scale scene: the plant drawn at its ultimate height × spread beside a
// faint human silhouette (1.8m) for instant sense of scale, with subtle metre gridlines. The view
// scales so the taller of plant/human fills the frame (capped at 12m — taller plants show a "+"),
// so a 20cm herb and an 8m tree both read correctly. Height/spread/time are labelled beneath.
// Illustrative placeholder palette (leaf green / bark) — a brand pass can retune it.

const CANOPY = '#6aa564'
const BARK = '#7c5a3b'

// viewBox geometry (the SVG scales to the card; ground stays at the bottom).
const W = 240
const H = 170
const GROUND_Y = 146
const TOP_PAD = 12
const DRAWABLE = GROUND_Y - TOP_PAD
const HUMAN_M = 1.8
const CAP_M = 12
const HUMAN_X = 46
const PLANT_X = 158
const MAX_CANOPY = 150

/** A minimal pawn-like human silhouette, feet on the ground, `hPx` tall. */
function Human({ hPx }: { hPx: number }) {
  const footW = hPx * 0.22
  const neckW = hPx * 0.1
  const neckY = GROUND_Y - hPx * 0.82
  const headR = hPx * 0.12
  const headCy = neckY - headR * 0.6
  return (
    <g fill="var(--tl-text-subtle)" opacity={0.75}>
      <path
        d={`M${HUMAN_X - footW} ${GROUND_Y} L${HUMAN_X - neckW} ${neckY} Q${HUMAN_X} ${neckY - hPx * 0.05} ${HUMAN_X + neckW} ${neckY} L${HUMAN_X + footW} ${GROUND_Y} Z`}
      />
      <circle cx={HUMAN_X} cy={headCy} r={headR} />
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
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax meet" className="h-full w-full">
          {/* metre gridlines + labels */}
          {ticks.map((m) => {
            const y = GROUND_Y - m * scale
            return (
              <g key={m}>
                <line x1={14} y1={y} x2={W - 8} y2={y} stroke="var(--tl-border)" strokeWidth={1} strokeDasharray="2 3" />
                <text x={4} y={y + 3} fontSize={9} fill="var(--tl-text-subtle)">
                  {m}
                </text>
              </g>
            )
          })}

          {/* ground */}
          <line x1={8} y1={GROUND_Y} x2={W - 8} y2={GROUND_Y} stroke="var(--tl-border-strong)" strokeWidth={1.5} />

          <Human hPx={humanPx} />
          <Plant hPx={plantPx} canopyW={canopyW} heightM={drawH} />

          {/* "taller than the frame" marker for trees beyond the cap */}
          {overCap && (
            <text x={PLANT_X} y={TOP_PAD} fontSize={12} fontWeight={700} fill={CANOPY} textAnchor="middle">
              ↑
            </text>
          )}
          {/* human height label */}
          <text x={HUMAN_X} y={GROUND_Y - humanPx - 4} fontSize={8} fill="var(--tl-text-subtle)" textAnchor="middle">
            1.8m
          </text>
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
