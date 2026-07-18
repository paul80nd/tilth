import { useRef, useState } from 'react'
import type { Bed, Holding, Rect } from '../../schema/userData'
import type { PlantNode } from '../../schema/plant'
import { displayLabel } from '../../lib/naming'
import { plantsInRegion } from '../../lib/spacing'
import { snapRect, clampRect } from '../../lib/plot'

// The interactive plot canvas — beds drawn to metre scale, plants placed within them at their
// spacing footprint. Everything is computed in PIXEL space (metres × pixels-per-metre + pan) so
// SVG strokes and text don't scale with zoom; the maths (packing, snap, clamp) stays in the pure
// libs. Pointer-events based (no HTML5 drag-and-drop) so it behaves the same in every browser.

/** The working extent of the plot, in metres. Beds are clamped inside it. */
export const PLOT_W = 16
export const PLOT_H = 12
const BASE_PPM = 64 // pixels per metre at zoom 1
const MIN_Z = 0.4
const MAX_Z = 2.4
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

export type Selection = { type: 'bed' | 'placement'; id: string } | null

export interface PlotCanvasProps {
  beds: Bed[]
  /** Placed holdings (those with a `bedId` + `region`). */
  placements: Holding[]
  nodesById: Map<string, PlantNode>
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

export default function PlotCanvas({
  beds,
  placements,
  nodesById,
  selection,
  brushNodeId,
  onSelect,
  onMoveBed,
  onMovePlacement,
  onPlace,
}: PlotCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [z, setZ] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [drag, setDrag] = useState<Drag | null>(null)
  // Live drag previews (avoid hitting Dexie every pointermove; commit on pointer-up).
  const [draftBed, setDraftBed] = useState<{ id: string; rect: Rect } | null>(null)
  const [draftPlacement, setDraftPlacement] = useState<{ id: string; region: Rect } | null>(null)
  const [drawRect, setDrawRect] = useState<{ bedId: string; region: Rect } | null>(null)

  const ppm = BASE_PPM * z
  const toPx = (mx: number, my: number) => ({ x: pan.x + mx * ppm, y: pan.y + my * ppm })
  const len = (m: number) => m * ppm

  /** Pointer client coords → plot-space metres. */
  function toMetres(e: React.PointerEvent): { mx: number; my: number } {
    const r = svgRef.current!.getBoundingClientRect()
    return { mx: (e.clientX - r.left - pan.x) / ppm, my: (e.clientY - r.top - pan.y) / ppm }
  }

  const bedById = (id?: string) => beds.find((b) => b.id === id)
  /** The step a bed snaps to: its grid cell, else a 10 cm nudge. */
  const stepOf = (bed?: Bed) => (bed?.spacing === 'grid' ? bed.cellSize ?? 0.3 : 0.1)

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
      const rect = clampRect({ x: mx - drag.grabDX, y: my - drag.grabDY, width: bed.width, height: bed.height }, PLOT_W, PLOT_H)
      setDraftBed({ id: bed.id, rect })
    } else if (drag.kind === 'resize-bed') {
      const bed = bedById(drag.id)!
      const rect = clampRect({ x: bed.x, y: bed.y, width: Math.max(0.3, mx - bed.x), height: Math.max(0.3, my - bed.y) }, PLOT_W, PLOT_H)
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

  const gridLines: React.ReactNode[] = []
  for (let i = 0; i <= PLOT_W; i++) {
    const x = pan.x + i * ppm
    gridLines.push(<line key={`v${i}`} x1={x} y1={pan.y} x2={x} y2={pan.y + PLOT_H * ppm} className="stroke-line" strokeWidth={i % 5 === 0 ? 1.2 : 0.6} />)
  }
  for (let j = 0; j <= PLOT_H; j++) {
    const y = pan.y + j * ppm
    gridLines.push(<line key={`h${j}`} x1={pan.x} y1={y} x2={pan.x + PLOT_W * ppm} y2={y} className="stroke-line" strokeWidth={j % 5 === 0 ? 1.2 : 0.6} />)
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
        {/* plot extent + grid */}
        <rect x={pan.x} y={pan.y} width={PLOT_W * ppm} height={PLOT_H * ppm} className="fill-card" />
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
              <rect x={p.x} y={p.y} width={len(r.width)} height={len(r.height)} rx={4} className={['fill-inset', selected ? 'stroke-brand' : 'stroke-line-strong'].join(' ')} strokeWidth={selected ? 2 : 1.2} />
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
        <button type="button" className="border-t border-line px-2.5 py-1.5 text-sm text-muted hover:bg-sunken hover:text-ink" onClick={() => setZ((v) => Math.max(MIN_Z, +(v - 0.2).toFixed(2)))} aria-label="Zoom out">－</button>
      </div>
    </div>
  )
}
