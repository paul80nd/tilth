import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Bed, Holding, Rect } from '../schema/userData'
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
  unplace,
} from '../app/garden'
import { displayLabel } from '../lib/naming'
import { clampRect } from '../lib/plot'
import PlotCanvas, { PLOT_W, PLOT_H, type Selection } from '../components/plot/PlotCanvas'
import Palette from '../components/plot/Palette'
import Inspector from '../components/plot/Inspector'

// "My garden" — the visual garden planner. A plot of beds you draw plants onto at their spacing;
// each placement is a holding (see docs/decisions.md), so what you lay out here IS what you grow.
// The page is a thin shell: every mutation goes through the src/app/garden.ts seam.

const BROWSABLE = new Set<PlantNode['rank']>(['species', 'cultivar'])

export default function GardenPage() {
  const beds = useLiveQuery(listBeds, [], [] as Bed[])
  const holdings = useLiveQuery(listHoldings, [], [] as Holding[])
  const nodes = useLiveQuery(listNodes, [], [] as PlantNode[])

  const [selection, setSelection] = useState<Selection>(null)
  const [brushNodeId, setBrushNodeId] = useState<string | null>(null)

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const placements = useMemo(() => holdings.filter((h) => h.bedId && h.region), [holdings])
  const heldNodeIds = useMemo(() => new Set(holdings.map((h) => h.nodeId)), [holdings])
  const plants = useMemo(() => nodes.filter((n) => BROWSABLE.has(n.rank)), [nodes])

  const selectedBed = selection?.type === 'bed' ? beds.find((b) => b.id === selection.id) : undefined
  const selectedPlacement =
    selection?.type === 'placement' ? placements.find((h) => h.id === selection.id) : undefined

  // Shopping list — plant totals across the plot (grouped by node).
  const shopping = useMemo(() => {
    const totals = new Map<string, number>()
    for (const h of placements) totals.set(h.nodeId, (totals.get(h.nodeId) ?? 0) + (h.quantity ?? 0))
    return [...totals].sort((a, b) => b[1] - a[1])
  }, [placements])

  async function handleAddBed() {
    // Drop a fresh 2×1 m bed near the top-left, offset per existing bed so they don't stack exactly.
    const n = beds.length
    const rect = clampRect({ x: 0.5 + (n % 4) * 0.4, y: 0.5 + n * 1.4, width: 2, height: 1 }, PLOT_W, PLOT_H)
    const bed = await addBed({ name: `Bed ${n + 1}`, kind: 'raised-bed', spacing: 'free', ...rect })
    setSelection({ type: 'bed', id: bed.id })
  }

  return (
    <div className="flex h-full min-h-0">
      {/* palette */}
      <aside className="w-56 flex-none border-r border-line bg-card">
        <Palette plants={plants} heldNodeIds={heldNodeIds} brushNodeId={brushNodeId} onArm={setBrushNodeId} />
      </aside>

      {/* canvas + toolbar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-none items-center gap-3 border-b border-line bg-card px-4 py-2.5">
          <h1 className="font-display text-h2 font-semibold">My garden</h1>
          <span className="text-xs text-muted">
            {beds.length} {beds.length === 1 ? 'bed' : 'beds'} · {placements.length} plantings
          </span>
          <button
            type="button"
            onClick={handleAddBed}
            className="ml-auto rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-onbrand hover:opacity-90"
          >
            + Add bed
          </button>
        </div>

        {beds.length === 0 ? (
          <EmptyState onAddBed={handleAddBed} />
        ) : (
          <div className="min-h-0 flex-1">
            <PlotCanvas
              beds={beds}
              placements={placements}
              nodesById={nodesById}
              selection={selection}
              brushNodeId={brushNodeId}
              onSelect={setSelection}
              onMoveBed={(id, rect: Rect) => void updateBed(id, rect)}
              onMovePlacement={(id, region: Rect) => void movePlacement(id, region)}
              onPlace={(bedId, nodeId, region) => void placePlant({ nodeId, bedId, region, status: 'growing' })}
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
            onBedChange={(patch) => selectedBed && void updateBed(selectedBed.id, patch)}
            onRemoveBed={() => {
              if (selectedBed) {
                void removeBed(selectedBed.id)
                setSelection(null)
              }
            }}
            onQuantityChange={(qty) => selectedPlacement && void setQuantity(selectedPlacement.id, qty)}
            onUnplace={() => {
              if (selectedPlacement) {
                void unplace(selectedPlacement.id)
                setSelection(null)
              }
            }}
          />
        </div>
        {shopping.length > 0 && (
          <div className="flex-none border-t border-line p-3">
            <h2 className="text-sm font-semibold text-ink">Shopping list</h2>
            <ul className="mt-2 flex flex-col gap-1">
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
