import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Bed, Holding, Rect } from '../../schema/userData'
import type { PlantNode } from '../../schema/plant'
import { displayLabel } from '../../lib/naming'
import { plantsInRegion } from '../../lib/spacing'
import { snapRect, clampRect, bedGaps, type BedGap } from '../../lib/plot'

// The interactive plot canvas — beds drawn to metre scale, plants placed within them at their
// spacing footprint. Everything is computed in PIXEL space (metres × pixels-per-metre + pan) so
// SVG strokes and text don't scale with zoom; the maths (packing, snap, clamp) stays in the pure
// libs. Pointer-events based (no HTML5 drag-and-drop) so it behaves the same in every browser.

const BASE_PPM = 64 // pixels per metre at zoom 1
const MIN_Z = 0.4
const MAX_Z = 6 // zoom in hard for narrow gardens / cm-scale spacing

// Zoom is a viewport preference (like the theme), so it persists in localStorage — not in the
// garden data / backup. Restored (clamped) on mount so a plot opens at the zoom you left it.
const ZOOM_KEY = 'tilth-plot-zoom'
function readZoom(): number {
  const v = parseFloat(localStorage.getItem(ZOOM_KEY) ?? '')
  return Number.isFinite(v) ? Math.min(MAX_Z, Math.max(MIN_Z, v)) : 1
}
const HANDLE_PX = 14 // resize-handle hit radius
const DOT_CAP = 400 // don't draw more plant dots than this (a dense bed stays readable)

/** Placeholder per-category fill — literal hexes behind a later brand pass, like the condition
 *  glyphs. Used at low opacity so beds read through. */
const CAT_COLOR: Record<string, string> = {
  flower: '#c084fc',
  fruit: '#fb7185',
  herb: '#34d399',
  tree: '#60a5fa',
  veg: '#f59e0b',
}
const DEFAULT_COLOR = '#94a3b8'

/** Placeholder per-kind colour — literal hexes behind a later brand pass, like CAT_COLOR. Each bed
 *  kind gets a subtle diagonal hatch + matching border in its colour, so kinds read apart at a
 *  glance. */
const BED_KIND_COLOR: Record<Bed['kind'], string> = {
  bed: '#a1774f', // soil brown
  'raised-bed': '#b5793e', // timber
  container: '#d08a5a', // terracotta
  patio: '#8b93a1', // stone
  greenhouse: '#4fae8b', // glasshouse green
  coldframe: '#5f97c4', // cool blue
  border: '#a385c9', // planting-border plum
  structure: '#8a8f96', // slate
}
const bedColor = (kind: Bed['kind']) => BED_KIND_COLOR[kind] ?? DEFAULT_COLOR
const BED_KINDS = Object.keys(BED_KIND_COLOR) as Bed['kind'][]

/** The hatch texture for a bed kind: a tile size (px) + the marks drawn in the kind's colour over a
 *  themed base. Different geometries per kind (dots / verticals / squares / cross-hatch / diagonal)
 *  so kinds are distinguishable by texture, not colour alone. */
function bedPatternTile(kind: Bed['kind'], c: string): { size: number; marks: React.ReactNode } {
  switch (kind) {
    case 'bed': // light dots
    case 'raised-bed':
      return { size: 10, marks: <circle cx={5} cy={5} r={1.1} fill={c} fillOpacity={0.22} /> }
    case 'greenhouse': // vertical lines
      return { size: 8, marks: <path d="M4 0 L4 8" stroke={c} strokeWidth={1} strokeOpacity={0.18} /> }
    case 'patio': // wide squares
      return { size: 16, marks: <rect x={0.5} y={0.5} width={15} height={15} fill="none" stroke={c} strokeWidth={1} strokeOpacity={0.2} /> }
    case 'structure': // cross-hatch
      return { size: 8, marks: <path d="M0 8 L8 0 M0 0 L8 8" stroke={c} strokeWidth={1} strokeOpacity={0.16} /> }
    default: // diagonal hatch (container / coldframe / border)
      return { size: 8, marks: <path d="M0 8 L8 0 M-2 2 L2 -2 M6 10 L10 6" stroke={c} strokeWidth={1} strokeOpacity={0.16} /> }
  }
}

export type Selection = { type: 'bed' | 'placement'; id: string } | null

/** Imperative handle so the page can drop a new bed at the middle of what's on screen. */
export interface PlotCanvasHandle {
  /** The plot-metre point at the centre of the visible canvas (falls back to the plot centre
   *  before the canvas has mounted). */
  viewCentre: () => { x: number; y: number }
}

export interface PlotCanvasProps {
  beds: Bed[]
  /** Placed holdings (those with a `bedId` + `region`). */
  placements: Holding[]
  nodesById: Map<string, PlantNode>
  /** The plot extent (metres); beds are clamped inside it. */
  plotW: number
  plotH: number
  /** Snap bed drag/resize to the grid (grid beds → cell, free beds → 0.1 m); off = continuous. */
  snap: boolean
  selection: Selection
  /** The plant armed for placing (from the palette), or null. */
  brushNodeId: string | null
  onSelect: (sel: Selection) => void
  onMoveBed: (id: string, rect: Rect) => void
  onMovePlacement: (id: string, region: Rect) => void
  /** Draw a new placement: the brush plant over `region` (bed-local metres) of `bedId`. */
  onPlace: (bedId: string, nodeId: string, region: Rect) => void
}

interface Drag {
  kind: 'pan' | 'move-bed' | 'resize-bed' | 'move-placement' | 'draw'
  id?: string
  bedId?: string
  nodeId?: string
  // Pointer-down anchor in metres, and the grabbed object's offset so it doesn't jump.
  mx0: number
  my0: number
  grabDX: number
  grabDY: number
  ox0: number
  oy0: number
}

const catColor = (node?: PlantNode) => (node?.category && CAT_COLOR[node.category]) || DEFAULT_COLOR
const footprintOf = (h: Holding) => h.footprint ?? 0.3

function PlotCanvas(
  {
    beds,
    placements,
    nodesById,
    plotW,
    plotH,
    snap,
    selection,
    brushNodeId,
    onSelect,
    onMoveBed,
    onMovePlacement,
    onPlace,
  }: PlotCanvasProps,
  ref: React.Ref<PlotCanvasHandle>,
) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [z, setZ] = useState(readZoom)
  const [pan, setPan] = useState({ x: 40, y: 40 })

  // Remember the zoom between visits.
  useEffect(() => {
    localStorage.setItem(ZOOM_KEY, String(z))
  }, [z])
  const [drag, setDrag] = useState<Drag | null>(null)
  // Live drag previews (avoid hitting Dexie every pointermove; commit on pointer-up).
  const [draftBed, setDraftBed] = useState<{ id: string; rect: Rect } | null>(null)
  const [draftPlacement, setDraftPlacement] = useState<{ id: string; region: Rect } | null>(null)
  const [drawRect, setDrawRect] = useState<{ bedId: string; region: Rect } | null>(null)

  const ppm = BASE_PPM * z
  const toPx = (mx: number, my: number) => ({ x: pan.x + mx * ppm, y: pan.y + my * ppm })
  const len = (m: number) => m * ppm

  useImperativeHandle(ref, () => ({
    viewCentre: () => {
      const el = svgRef.current
      if (!el) return { x: plotW / 2, y: plotH / 2 }
      const r = el.getBoundingClientRect()
      return { x: (r.width / 2 - pan.x) / ppm, y: (r.height / 2 - pan.y) / ppm }
    },
  }))

  /** Pointer client coords → plot-space metres. */
  function toMetres(e: React.PointerEvent): { mx: number; my: number } {
    const r = svgRef.current!.getBoundingClientRect()
    return { mx: (e.clientX - r.left - pan.x) / ppm, my: (e.clientY - r.top - pan.y) / ppm }
  }

  const bedById = (id?: string) => beds.find((b) => b.id === id)
  /** The step a bed snaps to when snapping is on: its grid cell, else a 10 cm nudge. Snap off ⇒ 0
   *  (continuous). */
  const stepOf = (bed?: Bed) => (!snap ? 0 : bed?.spacing === 'grid' ? bed.cellSize ?? 0.3 : 0.1)

  function bedAt(mx: number, my: number): Bed | undefined {
    // topmost last-drawn wins
    for (let i = beds.length - 1; i >= 0; i--) {
      const b = beds[i]
      if (mx >= b.x && mx <= b.x + b.width && my >= b.y && my <= b.y + b.height) return b
    }
    return undefined
  }

  function placementAt(mx: number, my: number): Holding | undefined {
    for (let i = placements.length - 1; i >= 0; i--) {
      const h = placements[i]
      const bed = bedById(h.bedId)
      if (!bed || !h.region) continue
      const x = bed.x + h.region.x
      const y = bed.y + h.region.y
      if (mx >= x && mx <= x + h.region.width && my >= y && my <= y + h.region.height) return h
    }
    return undefined
  }

  function nearResizeHandle(bed: Bed, mx: number, my: number): boolean {
    const corner = { x: bed.x + bed.width, y: bed.y + bed.height }
    return Math.abs((mx - corner.x) * ppm) <= HANDLE_PX && Math.abs((my - corner.y) * ppm) <= HANDLE_PX
  }

  function onPointerDown(e: React.PointerEvent) {
    svgRef.current!.setPointerCapture(e.pointerId)
    const { mx, my } = toMetres(e)

    // 1) Brush armed + inside a bed → start drawing a new placement block.
    const overBed = bedAt(mx, my)
    if (brushNodeId && overBed) {
      setDrag({ kind: 'draw', bedId: overBed.id, nodeId: brushNodeId, mx0: mx, my0: my, grabDX: 0, grabDY: 0, ox0: 0, oy0: 0 })
      setDrawRect({ bedId: overBed.id, region: { x: mx - overBed.x, y: my - overBed.y, width: 0, height: 0 } })
      return
    }

    // 2) On a placement → select + move within its bed.
    const hit = placementAt(mx, my)
    if (hit && hit.region) {
      onSelect({ type: 'placement', id: hit.id })
      const bed = bedById(hit.bedId)!
      setDrag({ kind: 'move-placement', id: hit.id, bedId: bed.id, mx0: mx, my0: my, grabDX: mx - (bed.x + hit.region.x), grabDY: my - (bed.y + hit.region.y), ox0: 0, oy0: 0 })
      return
    }

    // 3) On a bed's resize handle → resize; else on the bed body → select + move.
    const bed = bedAt(mx, my)
    if (bed) {
      onSelect({ type: 'bed', id: bed.id })
      if (nearResizeHandle(bed, mx, my)) {
        setDrag({ kind: 'resize-bed', id: bed.id, mx0: mx, my0: my, grabDX: 0, grabDY: 0, ox0: 0, oy0: 0 })
      } else {
        setDrag({ kind: 'move-bed', id: bed.id, mx0: mx, my0: my, grabDX: mx - bed.x, grabDY: my - bed.y, ox0: 0, oy0: 0 })
      }
      return
    }

    // 4) Empty canvas → deselect + pan.
    onSelect(null)
    setDrag({ kind: 'pan', mx0: e.clientX, my0: e.clientY, grabDX: 0, grabDY: 0, ox0: pan.x, oy0: pan.y })
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return
    if (drag.kind === 'pan') {
      setPan({ x: drag.ox0 + (e.clientX - drag.mx0), y: drag.oy0 + (e.clientY - drag.my0) })
      return
    }
    const { mx, my } = toMetres(e)
    if (drag.kind === 'move-bed') {
      const bed = bedById(drag.id)!
      const rect = clampRect({ x: mx - drag.grabDX, y: my - drag.grabDY, width: bed.width, height: bed.height }, plotW, plotH)
      setDraftBed({ id: bed.id, rect })
    } else if (drag.kind === 'resize-bed') {
      const bed = bedById(drag.id)!
      const rect = clampRect({ x: bed.x, y: bed.y, width: Math.max(0.3, mx - bed.x), height: Math.max(0.3, my - bed.y) }, plotW, plotH)
      setDraftBed({ id: bed.id, rect })
    } else if (drag.kind === 'move-placement') {
      const bed = bedById(drag.bedId)!
      const h = placements.find((p) => p.id === drag.id)!
      const region = clampRect({ x: mx - drag.grabDX - bed.x, y: my - drag.grabDY - bed.y, width: h.region!.width, height: h.region!.height }, bed.width, bed.height)
      setDraftPlacement({ id: h.id, region })
    } else if (drag.kind === 'draw') {
      const bed = bedById(drag.bedId)!
      const x = Math.min(drag.mx0, mx) - bed.x
      const y = Math.min(drag.my0, my) - bed.y
      const width = Math.abs(mx - drag.mx0)
      const height = Math.abs(my - drag.my0)
      setDrawRect({ bedId: bed.id, region: clampRect({ x, y, width, height }, bed.width, bed.height) })
    }
  }

  function onPointerUp() {
    if (drag) {
      const bed = bedById(drag.id ?? drag.bedId)
      if (drag.kind === 'move-bed' && draftBed) {
        onMoveBed(draftBed.id, snapRect(draftBed.rect, stepOf(bed)))
      } else if (drag.kind === 'resize-bed' && draftBed) {
        onMoveBed(draftBed.id, snapRect(draftBed.rect, stepOf(bed)))
      } else if (drag.kind === 'move-placement' && draftPlacement) {
        onMovePlacement(draftPlacement.id, snapRect(draftPlacement.region, stepOf(bed)))
      } else if (drag.kind === 'draw' && drawRect && drag.nodeId) {
        // Tiny drag (a click) → a single-footprint block at the point; else the drawn region.
        // The real footprint/count is derived app-side (footprintOf the node) on placePlant.
        const r = drawRect.region
        const region = r.width < 0.05 || r.height < 0.05 ? { x: r.x, y: r.y, width: 0.3, height: 0.3 } : r
        onPlace(drawRect.bedId, drag.nodeId, snapRect(region, stepOf(bed)))
      }
    }
    setDrag(null)
    setDraftBed(null)
    setDraftPlacement(null)
    setDrawRect(null)
  }

  // Resolve a bed's current rect (draft override while dragging it).
  const bedRect = (b: Bed): Rect => (draftBed?.id === b.id ? draftBed.rect : { x: b.x, y: b.y, width: b.width, height: b.height })
  const placementRegion = (h: Holding): Rect =>
    draftPlacement?.id === h.id ? draftPlacement.region : h.region!

  // Metre gridlines up to the (possibly fractional) plot extent; the extent rect draws the border.
  const gridLines: React.ReactNode[] = []
  for (let i = 1; i < plotW; i++) {
    const x = pan.x + i * ppm
    gridLines.push(<line key={`v${i}`} x1={x} y1={pan.y} x2={x} y2={pan.y + plotH * ppm} className="stroke-line" strokeWidth={i % 5 === 0 ? 1.2 : 0.6} />)
  }
  for (let j = 1; j < plotH; j++) {
    const y = pan.y + j * ppm
    gridLines.push(<line key={`h${j}`} x1={pan.x} y1={y} x2={pan.x + plotW * ppm} y2={y} className="stroke-line" strokeWidth={j % 5 === 0 ? 1.2 : 0.6} />)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-sunken">
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        style={{ cursor: brushNodeId ? 'crosshair' : drag?.kind === 'pan' ? 'grabbing' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* per-kind hatch fills — a themed base + a subtle texture in the kind's colour; the tile is
            a fixed px texture that pans with the plot (patternTransform) so it stays put under the
            beds. Geometry varies per kind (see bedPatternTile). */}
        <defs>
          {BED_KINDS.map((kind) => {
            const { size, marks } = bedPatternTile(kind, bedColor(kind))
            return (
              <pattern key={kind} id={`bedhatch-${kind}`} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x % size} ${pan.y % size})`}>
                <rect width={size} height={size} className="fill-inset" />
                {marks}
              </pattern>
            )
          })}
        </defs>

        {/* plot extent + grid */}
        <rect x={pan.x} y={pan.y} width={plotW * ppm} height={plotH * ppm} className="fill-card stroke-line-strong" strokeWidth={1.5} />
        {gridLines}

        {/* beds */}
        {beds.map((b) => {
          const r = bedRect(b)
          const p = toPx(r.x, r.y)
          const selected = selection?.type === 'bed' && selection.id === b.id
          const cells: React.ReactNode[] = []
          if (b.spacing === 'grid' && b.cellSize) {
            for (let cx = b.cellSize; cx < r.width - 1e-6; cx += b.cellSize)
              cells.push(<line key={`cx${cx}`} x1={p.x + len(cx)} y1={p.y} x2={p.x + len(cx)} y2={p.y + len(r.height)} className="stroke-line" strokeWidth={0.5} />)
            for (let cy = b.cellSize; cy < r.height - 1e-6; cy += b.cellSize)
              cells.push(<line key={`cy${cy}`} x1={p.x} y1={p.y + len(cy)} x2={p.x + len(r.width)} y2={p.y + len(cy)} className="stroke-line" strokeWidth={0.5} />)
          }
          return (
            <g key={b.id}>
              <rect
                x={p.x}
                y={p.y}
                width={len(r.width)}
                height={len(r.height)}
                rx={4}
                fill={`url(#bedhatch-${b.kind})`}
                className={selected ? 'stroke-brand' : undefined}
                stroke={selected ? undefined : bedColor(b.kind)}
                strokeOpacity={selected ? 1 : 0.75}
                strokeWidth={selected ? 2 : 1.2}
              />
              {cells}
              <text x={p.x + 6} y={p.y + 16} className="fill-subtle" fontSize={11} fontWeight={600}>
                {b.name} · {r.width.toFixed(1)}×{r.height.toFixed(1)}m
              </text>
              {selected && <rect x={p.x + len(r.width) - 6} y={p.y + len(r.height) - 6} width={12} height={12} className="fill-brand" />}
            </g>
          )
        })}

        {/* placements */}
        {placements.map((h) => {
          const bed = bedById(h.bedId)
          if (!bed || !h.region) return null
          const region = placementRegion(h)
          const p = toPx(bed.x + region.x, bed.y + region.y)
          const node = nodesById.get(h.nodeId)
          const color = catColor(node)
          const selected = selection?.type === 'placement' && selection.id === h.id
          const fp = footprintOf(h)
          // The stored quantity is the source of truth (never < 1, hand-overridable); the raw
          // packing count can be 0 when the plant is bigger than the drawn block.
          const count = h.quantity ?? Math.max(1, plantsInRegion(fp, region))
          // plant dots (square packing), capped. A plant bigger than its block still draws one
          // dot, sized to the block rather than ballooning past it.
          const dots: React.ReactNode[] = []
          const cols = Math.max(1, Math.floor(region.width / fp + 1e-9))
          const rows = Math.max(1, Math.floor(region.height / fp + 1e-9))
          const minSidePx = Math.min(len(region.width), len(region.height))
          const rDot = Math.max(2, Math.min(len(fp) * 0.32, minSidePx * 0.42))
          let drawn = 0
          for (let cy = 0; cy < rows && drawn < DOT_CAP; cy++) {
            for (let cx = 0; cx < cols && drawn < DOT_CAP; cx++) {
              dots.push(<circle key={`${cx}-${cy}`} cx={p.x + len((cx + 0.5) * fp)} cy={p.y + len((cy + 0.5) * fp)} r={rDot} fill={color} />)
              drawn++
            }
          }
          return (
            <g key={h.id}>
              <rect x={p.x} y={p.y} width={len(region.width)} height={len(region.height)} rx={3} fill={color} fillOpacity={0.14} stroke={color} strokeWidth={selected ? 2.5 : 1.2} strokeOpacity={selected ? 1 : 0.6} />
              {dots}
              <text x={p.x + 4} y={p.y + 13} fontSize={10.5} fontWeight={700} className="fill-ink">
                {node ? displayLabel(node) : h.nodeId} ×{count}
              </text>
            </g>
          )
        })}

        {/* selected bed: clear distance to the nearest bed each way (or the plot edge) */}
        {selection?.type === 'bed' &&
          (() => {
            const b = beds.find((x) => x.id === selection.id)
            if (!b) return null
            const r = bedRect(b)
            const g = bedGaps(r, beds.filter((x) => x.id !== b.id), plotW, plotH)
            const midX = r.x + r.width / 2
            const midY = r.y + r.height / 2
            const dims: { gap: BedGap; x1: number; y1: number; x2: number; y2: number; horiz: boolean }[] = [
              { gap: g.east, x1: r.x + r.width, y1: midY, x2: r.x + r.width + g.east.dist, y2: midY, horiz: true },
              { gap: g.west, x1: r.x, y1: midY, x2: r.x - g.west.dist, y2: midY, horiz: true },
              { gap: g.north, x1: midX, y1: r.y, x2: midX, y2: r.y - g.north.dist, horiz: false },
              { gap: g.south, x1: midX, y1: r.y + r.height, x2: midX, y2: r.y + r.height + g.south.dist, horiz: false },
            ]
            const TICK = 4
            return (
              <g>
                {dims.map((d, i) => {
                  if (d.gap.dist < 0.02) return null // flush — nothing to show
                  const p1 = toPx(d.x1, d.y1)
                  const p2 = toPx(d.x2, d.y2)
                  const mx = (p1.x + p2.x) / 2
                  const my = (p1.y + p2.y) / 2
                  const label = `${+d.gap.dist.toFixed(2)} m`
                  const strokeCls = d.gap.toEdge ? 'stroke-subtle' : 'stroke-brand'
                  const w = label.length * 6 + 6
                  return (
                    <g key={i}>
                      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={strokeCls} strokeWidth={1} strokeDasharray="3 2" />
                      <line x1={p1.x - (d.horiz ? 0 : TICK)} y1={p1.y - (d.horiz ? TICK : 0)} x2={p1.x + (d.horiz ? 0 : TICK)} y2={p1.y + (d.horiz ? TICK : 0)} className={strokeCls} strokeWidth={1} />
                      <line x1={p2.x - (d.horiz ? 0 : TICK)} y1={p2.y - (d.horiz ? TICK : 0)} x2={p2.x + (d.horiz ? 0 : TICK)} y2={p2.y + (d.horiz ? TICK : 0)} className={strokeCls} strokeWidth={1} />
                      <rect x={mx - w / 2} y={my - 7} width={w} height={14} rx={2} className="fill-card" opacity={0.85} />
                      <text x={mx} y={my + 3.5} textAnchor="middle" fontSize={10} fontWeight={600} className={d.gap.toEdge ? 'fill-subtle' : 'fill-brand'}>
                        {label}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })()}

        {/* rubber-band while drawing a new placement */}
        {drawRect &&
          (() => {
            const bed = bedById(drawRect.bedId)!
            const p = toPx(bed.x + drawRect.region.x, bed.y + drawRect.region.y)
            return <rect x={p.x} y={p.y} width={len(drawRect.region.width)} height={len(drawRect.region.height)} rx={3} className="fill-brand stroke-brand" fillOpacity={0.15} strokeWidth={1.5} strokeDasharray="4 3" />
          })()}
      </svg>

      {/* zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-md border border-line bg-card shadow-sm">
        <button type="button" className="px-2.5 py-1.5 text-sm text-muted hover:bg-sunken hover:text-ink" onClick={() => setZ((v) => Math.min(MAX_Z, +(v + 0.2).toFixed(2)))} aria-label="Zoom in">＋</button>
        <button type="button" className="border-t border-line px-1.5 py-1 text-[0.7rem] tabular-nums text-muted hover:bg-sunken hover:text-ink" onClick={() => setZ(1)} aria-label="Reset zoom to 100%" title="Reset zoom">
          {Math.round(z * 100)}%
        </button>
        <button type="button" className="border-t border-line px-2.5 py-1.5 text-sm text-muted hover:bg-sunken hover:text-ink" onClick={() => setZ((v) => Math.max(MIN_Z, +(v - 0.2).toFixed(2)))} aria-label="Zoom out">－</button>
      </div>
    </div>
  )
}

export default forwardRef(PlotCanvas)
