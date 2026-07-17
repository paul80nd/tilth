import type { Size } from '../schema/plant'
import { parseLength, type MetreRange } from '../lib/size'
import { Icon } from './icons'

// The Size card as a to-scale scene: the plant drawn at its ultimate height × spread beside a
// human figure (1.8m) for instant sense of scale, over subtle metre gridlines. The view scales so
// the taller of plant/human fills the frame (capped at 12m — taller plants show "↑"), so a 20cm
// herb and an 8m tree both read true; the silhouette grows a trunk as height increases. A compact
// fixed-height scene keeps it from dominating. Illustrative palette — a brand pass can retune it.
// The same figure runs small as a `SizeCell` glyph (the taxonomy table); `SizeDims` is the
// height/spread/time facts as a compact stack for beside it.

const CANOPY = '#6aa564'
const BARK = '#7c5a3b'
const HUMAN_M = 1.8
const CAP_M = 12

// Human figure — Fontisto "male" glyph (Team Redux, OFL/MIT; see CREDITS.md), recoloured via the
// subtle text token. Authored in a 1200×1200 box: horizontally centred (x=600) and filling the full
// height (head top y=0, feet y=1200), so we seat it by scaling that box to `h` px, feet on the ground.
const HUMAN_PATH =
  'M719.57 272.035q27.69 0 50.975 10.698c46.078 23.193 73.285 67.272 73.631 116.424V737.73c-8.643 53.824-70.25 39.188-71.742 0V418.037c-5.49-18.231-40.693-10.672-41.535 0v733.785c-8.951 74.928-105.773 52.934-108.242-1.258V701.23c-6.191-28.982-46.936-15.813-47.829 1.259c1.728 149.353 1.259 298.715 1.259 448.075c-9.656 74.543-106.007 55.47-108.243 1.258l-1.258-733.785c-5.643-17.838-38.263-10.996-39.019 0V737.73c-8.644 53.824-70.25 39.188-71.742 0V399.157c.871-47.056 18.117-94.197 59.156-116.424q20.139-10.7 49.087-10.699zm-1.269-153.758c0 65.323-52.955 118.278-118.278 118.278c-65.322 0-118.277-52.955-118.277-118.278C481.745 52.955 534.7 0 600.021 0c65.325 0 118.28 52.955 118.28 118.277'

/** The human figure, feet on `groundY` at `x`, `h` px tall. */
function Human({ h, x, groundY }: { h: number; x: number; groundY: number }) {
  const scale = h / 1200
  return (
    <g transform={`translate(${x - 600 * scale} ${groundY - 1200 * scale}) scale(${scale})`} fill="var(--tl-text-subtle)" opacity={0.75}>
      <path d={HUMAN_PATH} />
    </g>
  )
}

/** The plant silhouette: a mound canopy (width = spread) that grows a trunk as it gets taller. */
function Plant({ hPx, canopyW, heightM, x, groundY }: { hPx: number; canopyW: number; heightM: number; x: number; groundY: number }) {
  const trunkFrac = heightM > 2.5 ? 0.32 : heightM > 1.2 ? 0.14 : 0
  const trunkH = hPx * trunkFrac
  const base = groundY - trunkH
  const canopyH = hPx - trunkH
  const top = base - canopyH
  const hw = canopyW / 2
  const trunkW = Math.max(3, canopyW * 0.1)
  return (
    <g>
      {trunkH > 0 && (
        <rect x={x - trunkW / 2} y={base - 1} width={trunkW} height={trunkH + 1} fill={BARK} rx={1} />
      )}
      <path
        d={`M${x - hw} ${base} C${x - hw} ${base - canopyH * 1.15} ${x - hw * 0.4} ${top} ${x} ${top} C${x + hw * 0.4} ${top} ${x + hw} ${base - canopyH * 1.15} ${x + hw} ${base} Z`}
        fill={CANOPY}
      />
    </g>
  )
}

/** Shared scale maths: the px sizes to draw `h` (+ optional spread `s`) in a `drawable`-tall frame,
 *  the taller of plant/human filling it, capped at CAP_M. */
function scaleFor(h: MetreRange, s: MetreRange | undefined, drawable: number, maxCanopy: number) {
  const drawH = Math.min(h.max, CAP_M)
  const viewM = Math.min(Math.max(drawH, HUMAN_M), CAP_M)
  const scale = drawable / viewM
  return {
    overCap: h.max > CAP_M || h.openEnded,
    viewM,
    scale,
    drawH,
    plantPx: drawH * scale,
    humanPx: HUMAN_M * scale,
    canopyW: Math.min((s?.max ?? h.max * 0.6) * scale, maxCanopy),
  }
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

/** A compact square glyph of the size scene — human + plant to scale, no gridlines or labels.
 *  Used in the taxonomy table beside the stacked dimensions. Null when there's no height to scale. */
export function SizeCell({ size, px = 46 }: { size?: Size; px?: number }) {
  const h = parseLength(size?.height)
  if (!h) return null
  const s = parseLength(size?.spread)
  const V = 100
  const TOP = 8
  const groundY = V
  const HUMAN_X = 30
  const PLANT_X = 68
  const { overCap, drawH, plantPx, humanPx, canopyW } = scaleFor(h, s, groundY - TOP, 44)
  return (
    <svg viewBox={`0 0 ${V} ${V}`} width={px} height={px} className="block flex-none" aria-hidden>
      <Human h={humanPx} x={HUMAN_X} groundY={groundY} />
      <Plant hPx={plantPx} canopyW={canopyW} heightM={drawH} x={PLANT_X} groundY={groundY} />
      {overCap && (
        <text x={PLANT_X} y={TOP} fontSize={13} fontWeight={700} fill={CANOPY} textAnchor="middle">↑</text>
      )}
    </svg>
  )
}

/** Height / spread / time-to-size as a compact vertical stack (each an icon + its label). Null
 *  when none are recorded. */
export function SizeDims({ size }: { size?: Size }) {
  const rows: Array<{ icon: 'height' | 'spread' | 'time'; value: string }> = []
  if (size?.height) rows.push({ icon: 'height', value: size.height })
  if (size?.spread) rows.push({ icon: 'spread', value: size.spread })
  if (size?.timeToSize) rows.push({ icon: 'time', value: size.timeToSize })
  if (!rows.length) return null
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-[0.65rem] leading-tight text-muted">
      {rows.map((r) => (
        <span key={r.icon} className="inline-flex items-center gap-1">
          <span className="flex-none text-brand-ink"><Icon name={r.icon} width={12} height={12} /></span>
          <span className="truncate">{r.value}</span>
        </span>
      ))}
    </div>
  )
}

export default function SizeCard({ size }: { size?: Size }) {
  const h: MetreRange | undefined = parseLength(size?.height)
  const s: MetreRange | undefined = parseLength(size?.spread)

  if (!h) {
    return <p className="p-4 text-sm text-muted">Not recorded yet.</p>
  }

  // Card geometry: a landscape scene bleeding to the card's full width.
  const W = 240
  const H = 116
  const GROUND_Y = H
  const TOP_PAD = 14
  const HUMAN_X = 46
  const PLANT_X = 158
  const { overCap, viewM, scale, drawH, plantPx, humanPx, canopyW } = scaleFor(h, s, GROUND_Y - TOP_PAD, 150)

  const step = Math.ceil(viewM / 6)
  const ticks: number[] = []
  for (let m = step; m <= viewM; m += step) ticks.push(m)

  return (
    <div className="flex flex-col">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
        {/* metre gridlines, full-bleed; labels indented from the left edge */}
        {ticks.map((m) => {
          const y = GROUND_Y - m * scale
          return (
            <g key={m}>
              <line x1={0} y1={y} x2={W} y2={y} stroke="var(--tl-border)" strokeWidth={1} strokeDasharray="2 3" />
              <text x={7} y={y - 3} fontSize={9} fill="var(--tl-text-subtle)">
                {m}
              </text>
            </g>
          )
        })}

        {/* No drawn ground line — the labels row's top border (at the SVG's bottom edge) is the ground. */}
        <Human h={humanPx} x={HUMAN_X} groundY={GROUND_Y} />
        <Plant hPx={plantPx} canopyW={canopyW} heightM={drawH} x={PLANT_X} groundY={GROUND_Y} />

        {/* "taller than the frame" marker for trees beyond the cap */}
        {overCap && (
          <text x={PLANT_X} y={TOP_PAD} fontSize={12} fontWeight={700} fill={CANOPY} textAnchor="middle">
            ↑
          </text>
        )}
      </svg>

      {/* labels — this row's top border doubles as the ground line */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-line px-3 py-2 text-xs">
        <Fact icon="height">{size?.height}</Fact>
        {size?.spread && <Fact icon="spread">{size.spread}</Fact>}
        {size?.timeToSize && <Fact icon="time">{size.timeToSize}</Fact>}
      </div>
    </div>
  )
}
