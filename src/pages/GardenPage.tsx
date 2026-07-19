import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Bed, Holding, PlacementShape, Rect } from '../schema/userData'
import type { PlantNode } from '../schema/plant'
import { listNodes } from '../app/plants'
import {
  listBeds,
  listHoldings,
  addBed,
  updateBed,
  removeBed,
  placePlant,
  movePlacement,
  setQuantity,
  setPlacementShape,
  unplace,
  getPlotSize,
  setPlotSize,
  DEFAULT_PLOT_W,
  DEFAULT_PLOT_H,
} from '../app/garden'
import { displayLabel } from '../lib/naming'
import { categoryColor } from '../lib/plantColor'
import { placementCount } from '../lib/spacing'
import { clampRect } from '../lib/plot'
import PlotCanvas, { type Selection, type PlotCanvasHandle } from '../components/plot/PlotCanvas'
import Palette from '../components/plot/Palette'
import Inspector from '../components/plot/Inspector'
import { PlotSizeModal } from '../components/plot/PlotSizeModal'

// "My garden" — the visual garden planner. A plot of beds you draw plants onto at their spacing;
// each placement is a holding (see docs/decisions.md), so what you lay out here IS what you grow.
// The page is a thin shell: every mutation goes through the src/app/garden.ts seam.

const BROWSABLE = new Set<PlantNode['rank']>(['species', 'cultivar'])

// Locking beds is an editing preference (like zoom), so it lives in localStorage — not the garden
// data / backup. It survives a reload so a finished layout stays protected.
const LOCK_KEY = 'tilth-beds-locked'
const readBedsLocked = () => localStorage.getItem(LOCK_KEY) === '1'

export default function GardenPage() {
  const beds = useLiveQuery(listBeds, [], [] as Bed[])
  const holdings = useLiveQuery(listHoldings, [], [] as Holding[])
  const nodes = useLiveQuery(listNodes, [], [] as PlantNode[])
  const plot = useLiveQuery(getPlotSize, [], { width: DEFAULT_PLOT_W, height: DEFAULT_PLOT_H })

  const [selection, setSelection] = useState<Selection>(null)
  const [brushNodeId, setBrushNodeId] = useState<string | null>(null)
  const [brushShape, setBrushShape] = useState<PlacementShape>('area')
  const [snap, setSnap] = useState(true)
  const [bedsLocked, setBedsLocked] = useState(readBedsLocked)
  const [plotModalOpen, setPlotModalOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(LOCK_KEY, bedsLocked ? '1' : '0')
  }, [bedsLocked])
  const canvasRef = useRef<PlotCanvasHandle>(null)

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const placements = useMemo(() => holdings.filter((h) => h.bedId && h.region), [holdings])
  const heldNodeIds = useMemo(() => new Set(holdings.map((h) => h.nodeId)), [holdings])
  const plants = useMemo(() => nodes.filter((n) => BROWSABLE.has(n.rank)), [nodes])

  const selectedBed = selection?.type === 'bed' ? beds.find((b) => b.id === selection.id) : undefined
  const selectedPlacement =
    selection?.type === 'placement' ? placements.find((h) => h.id === selection.id) : undefined

  // The snap increment for the selected bed's typed sizes: 0 when snapping is off, else its grid
  // cell (grid beds) or a 10 cm nudge (free beds).
  const bedStep = selectedBed?.spacing === 'grid' ? selectedBed.cellSize ?? 0.3 : 0.1
  const snapStep = snap ? bedStep : 0

  // What's planted in the selected bed — a colour-swatched list so the canvas can stay symbol-first
  // (names shown on demand). Clicking a row selects that planting on the plot.
  const bedPlantings = useMemo(() => {
    if (!selectedBed) return []
    return placements
      .filter((h) => h.bedId === selectedBed.id && h.region)
      .map((h) => {
        const node = nodesById.get(h.nodeId)
        return {
          id: h.id,
          label: node ? displayLabel(node) : h.nodeId,
          color: categoryColor(node),
          count: h.quantity ?? placementCount(h.shape, h.footprint ?? 0.3, h.region!),
        }
      })
  }, [selectedBed, placements, nodesById])

  // Shopping list — plant totals across the plot (grouped by node).
  const shopping = useMemo(() => {
    const totals = new Map<string, number>()
    for (const h of placements) totals.set(h.nodeId, (totals.get(h.nodeId) ?? 0) + (h.quantity ?? 0))
    return [...totals].sort((a, b) => b[1] - a[1])
  }, [placements])

  async function handleAddBed() {
    // Drop a fresh 2×1 m bed centred on the current view (falls back to the plot centre before the
    // canvas has mounted, e.g. the first bed from the empty state).
    const n = beds.length
    const width = 2
    const height = 1
    const c = canvasRef.current?.viewCentre() ?? { x: plot.width / 2, y: plot.height / 2 }
    const rect = clampRect({ x: c.x - width / 2, y: c.y - height / 2, width, height }, plot.width, plot.height)
    const bed = await addBed({ name: `Bed ${n + 1}`, kind: 'raised-bed', spacing: 'free', ...rect })
    setSelection({ type: 'bed', id: bed.id })
  }

  // A bed's own fields. Geometry (width/height typed in the inspector) is clamped to the plot; a
  // typed size is taken as exact (only drag-resize snaps, per the toggle). Other fields pass through.
  function handleBedChange(patch: Partial<Bed>) {
    if (!selectedBed) return
    if (patch.width !== undefined || patch.height !== undefined) {
      const rect = clampRect(
        {
          x: selectedBed.x,
          y: selectedBed.y,
          width: Math.max(0.3, patch.width ?? selectedBed.width),
          height: Math.max(0.3, patch.height ?? selectedBed.height),
        },
        plot.width,
        plot.height,
      )
      void updateBed(selectedBed.id, { x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    } else {
      void updateBed(selectedBed.id, patch)
    }
  }

  return (
    <div className="flex h-full min-h-0">
      {/* palette */}
      <aside className="w-56 flex-none border-r border-line bg-card">
        <Palette plants={plants} heldNodeIds={heldNodeIds} brushNodeId={brushNodeId} brushShape={brushShape} onArm={setBrushNodeId} onShapeChange={setBrushShape} />
      </aside>

      {/* canvas + toolbar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-none items-center gap-3 border-b border-line bg-card px-4 py-2.5">
          <h1 className="font-display text-h2 font-semibold">My garden</h1>
          <span className="text-xs text-muted">
            {beds.length} {beds.length === 1 ? 'bed' : 'beds'} · {placements.length} plantings ·{' '}
            {plot.width.toFixed(1)}×{plot.height.toFixed(1)} m
          </span>
          <label className="ml-auto flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} className="accent-brand" />
            Snap to grid
          </label>
          <button
            type="button"
            onClick={() => setBedsLocked((v) => !v)}
            aria-pressed={bedsLocked}
            title={bedsLocked ? 'Beds are locked — click to unlock' : 'Lock beds so they can’t be moved or resized'}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium',
              bedsLocked ? 'bg-brand text-onbrand' : 'border border-line text-muted hover:border-line-strong hover:text-ink',
            ].join(' ')}
          >
            {bedsLocked ? '🔒' : '🔓'} Lock beds
          </button>
          <button
            type="button"
            onClick={() => setPlotModalOpen(true)}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:border-line-strong hover:text-ink"
          >
            Plot size…
          </button>
          <button
            type="button"
            onClick={handleAddBed}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-onbrand hover:opacity-90"
          >
            + Add bed
          </button>
        </div>

        {beds.length === 0 ? (
          <EmptyState onAddBed={handleAddBed} />
        ) : (
          <div className="min-h-0 flex-1">
            <PlotCanvas
              ref={canvasRef}
              beds={beds}
              placements={placements}
              nodesById={nodesById}
              plotW={plot.width}
              plotH={plot.height}
              snap={snap}
              bedsLocked={bedsLocked}
              selection={selection}
              brushNodeId={brushNodeId}
              brushShape={brushShape}
              onSelect={setSelection}
              onMoveBed={(id, rect: Rect) => void updateBed(id, rect)}
              onMovePlacement={(id, region: Rect) => void movePlacement(id, region)}
              onPlace={(bedId, nodeId, region, shape) => void placePlant({ nodeId, bedId, region, shape, status: 'growing' })}
            />
          </div>
        )}
      </div>

      {/* inspector + shopping list */}
      <aside className="flex w-64 flex-none flex-col border-l border-line bg-card">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Inspector
            bed={selectedBed}
            placement={selectedPlacement}
            node={selectedPlacement ? nodesById.get(selectedPlacement.nodeId) : undefined}
            bedPlantings={bedPlantings}
            snapStep={snapStep}
            onSelectPlanting={(id) => setSelection({ type: 'placement', id })}
            onBedChange={handleBedChange}
            onRemoveBed={() => {
              if (selectedBed) {
                void removeBed(selectedBed.id)
                setSelection(null)
              }
            }}
            onQuantityChange={(qty) => selectedPlacement && void setQuantity(selectedPlacement.id, qty)}
            onPlacementShapeChange={(shape) => selectedPlacement && void setPlacementShape(selectedPlacement.id, shape)}
            onPlacementResize={(region) => {
              if (!selectedPlacement) return
              const bed = beds.find((b) => b.id === selectedPlacement.bedId)
              const clamped = bed ? clampRect(region, bed.width, bed.height) : region
              void movePlacement(selectedPlacement.id, clamped)
            }}
            onUnplace={() => {
              if (selectedPlacement) {
                void unplace(selectedPlacement.id)
                setSelection(null)
              }
            }}
          />
        </div>
        {shopping.length > 0 && (
          <div className="flex max-h-[33%] flex-none flex-col border-t border-line p-3">
            <h2 className="flex-none text-sm font-semibold text-ink">Shopping list</h2>
            <ul className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {shopping.map(([nodeId, qty]) => {
                const node = nodesById.get(nodeId)
                return (
                  <li key={nodeId} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate text-ink">{node ? displayLabel(node) : nodeId}</span>
                    <span className="shrink-0 tabular-nums font-medium text-muted">{qty}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </aside>

      {plotModalOpen && (
        <PlotSizeModal
          plot={plot}
          onResize={(size, anchor) => void setPlotSize(size, anchor)}
          onClose={() => setPlotModalOpen(false)}
        />
      )}
    </div>
  )
}

function EmptyState({ onAddBed }: { onAddBed: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-sunken">
      <div className="max-w-sm rounded-lg border border-dashed border-line-strong bg-card p-8 text-center">
        <h2 className="font-display text-h2 font-semibold">Draw your garden</h2>
        <p className="mt-2 text-sm text-muted">
          Add a bed, then pick a plant from the left and draw it on at its spacing — you'll see how
          many fit and a shopping list of what to buy.
        </p>
        <button
          type="button"
          onClick={onAddBed}
          className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-onbrand hover:opacity-90"
        >
          + Add your first bed
        </button>
      </div>
    </div>
  )
}
