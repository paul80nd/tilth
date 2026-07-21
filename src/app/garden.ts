// Application layer: the garden-planner use-cases — the seam the plot canvas UI and the Gherkin
// feature tests both drive (React stays a thin shell; behaviour is tested here against
// fake-indexeddb). Beds are a new store; a plant placed on a bed IS a holding that gains spatial
// fields (see docs/decisions.md), so placing/moving a plant reads/writes the `holdings` store.
//
// Pure maths (footprint, count, geometry) lives in src/lib/spacing.ts + src/lib/plot.ts; this
// module only orchestrates Dexie and marks the store user-owned so the demo re-seed can't clobber
// a real garden.

import { db } from '../db/db'
import { markUser } from './dataSource'
import type { Bed, Holding, PlacementShape, Rect } from '../schema/userData'
import { footprintOf, placementCount } from '../lib/spacing'
import { reanchorRects, type PlotAnchor } from '../lib/plot'
import { rotationForYear, type BedRotation } from '../lib/rotation'
import { companionsForYear, type BedCompanions } from '../lib/companions'

/** Fresh id for a hand-created bed/holding. `crypto.randomUUID` is available in every target
 *  (evergreen browsers, Node ≥22, the test env). */
function newId(): string {
  return crypto.randomUUID()
}

/** Read a holding, transform it with `fn`, and write the result back — marking the store
 *  user-owned. `fn` returns the updated holding, or `undefined` to leave it untouched (a missing
 *  holding, or a guard the op can't satisfy — no write, no mark). One transaction per call. */
async function patchHolding(id: string, fn: (h: Holding) => Holding | undefined): Promise<void> {
  await db.transaction('rw', db.holdings, db.settings, async () => {
    const h = await db.holdings.get(id)
    if (!h) return
    const next = fn(h)
    if (!next) return
    await db.holdings.put(next)
    await markUser()
  })
}

// --- Plot extent ----------------------------------------------------------------------------

/** The working extent of the plot (metres). Beds live inside it; it grows/shrinks on demand. */
export const DEFAULT_PLOT_W = 16
export const DEFAULT_PLOT_H = 12
const MIN_PLOT = 1
const MAX_PLOT = 100

export interface PlotSize {
  width: number
  height: number
}

/** Keep a plot dimension sane (finite, within [MIN_PLOT, MAX_PLOT]); fall back if it isn't. */
function clampPlot(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(MAX_PLOT, Math.max(MIN_PLOT, value))
}

/** The plot's current size, read from settings (persists + travels in the backup). Defaults to
 *  {@link DEFAULT_PLOT_W}×{@link DEFAULT_PLOT_H} until the user resizes it. */
export async function getPlotSize(): Promise<PlotSize> {
  const s = await db.settings.get('plot')
  const v = (s?.value ?? {}) as Partial<PlotSize>
  return {
    width: clampPlot(v.width ?? DEFAULT_PLOT_W, DEFAULT_PLOT_W),
    height: clampPlot(v.height ?? DEFAULT_PLOT_H, DEFAULT_PLOT_H),
  }
}

/** Resize the plot, keeping the `anchor` corner fixed: beds shift so they hold their place against
 *  that corner, then clamp inside the new extent (a shrink can leave a bed outside). Persists the
 *  size to settings and marks the store user-owned. */
export async function setPlotSize(size: Partial<PlotSize>, anchor: PlotAnchor = 'NW'): Promise<PlotSize> {
  let next!: PlotSize
  await db.transaction('rw', db.beds, db.settings, async () => {
    const cur = await getPlotSize()
    next = {
      width: clampPlot(size.width ?? cur.width, cur.width),
      height: clampPlot(size.height ?? cur.height, cur.height),
    }
    const beds = await db.beds.toArray()
    const moved = reanchorRects(beds, cur.width, cur.height, next.width, next.height, anchor)
    for (let i = 0; i < beds.length; i++) {
      const m = moved[i]
      await db.beds.put({ ...beds[i], x: m.x, y: m.y, width: m.width, height: m.height })
    }
    await db.settings.put({ key: 'plot', value: next })
    await markUser()
  })
  return next
}

// --- Beds -----------------------------------------------------------------------------------

/** Add a bed to the plot. `id` is optional (minted when absent) so tests can pin one. */
export async function addBed(input: Omit<Bed, 'id'> & { id?: string }): Promise<Bed> {
  const bed: Bed = { ...input, id: input.id ?? newId() }
  await db.transaction('rw', db.beds, db.settings, async () => {
    await db.beds.put(bed)
    await markUser()
  })
  return bed
}

/** Patch a bed's own fields (name/kind/geometry/spacing). Does not touch its placements. */
export async function updateBed(id: string, patch: Partial<Omit<Bed, 'id'>>): Promise<void> {
  await db.transaction('rw', db.beds, db.settings, async () => {
    const existing = await db.beds.get(id)
    if (!existing) return
    await db.beds.put({ ...existing, ...patch, id })
    await markUser()
  })
}

/** Remove a bed. Its placements are UNPLACED, not deleted — the holdings survive as flat-list
 *  entries (you removed the bed, not the plants). */
export async function removeBed(id: string): Promise<void> {
  await db.transaction('rw', db.beds, db.holdings, db.settings, async () => {
    const placed = await db.holdings.where('bedId').equals(id).toArray()
    for (const h of placed) {
      const { bedId: _b, region: _r, ...rest } = h
      await db.holdings.put(rest)
    }
    await db.beds.delete(id)
    await markUser()
  })
}

export function listBeds(): Promise<Bed[]> {
  return db.beds.toArray()
}

/** Every holding — the page derives placed vs unplaced (and the held-node set) from this. */
export function listHoldings(): Promise<Holding[]> {
  return db.holdings.toArray()
}

export function holdingsInBed(bedId: string): Promise<Holding[]> {
  return db.holdings.where('bedId').equals(bedId).toArray()
}

// --- Placements (a placement is a holding) --------------------------------------------------

export interface PlacePlantInput {
  nodeId: string
  bedId: string
  /** The block occupied within the bed (bed-local metres). Defaults to a single footprint. */
  region?: Rect
  /** How the region is occupied — packed `area` (default), or a single `round`/`rect` plant. */
  shape?: PlacementShape
  /** Reuse an existing holding (e.g. placing a wishlist entry) instead of creating one. */
  holdingId?: string
  status?: Holding['status']
  year?: number
}

/** Place a plant on a bed: create (or update) a holding with a derived footprint + count. The
 *  footprint comes from the reference node; the count is one for a single round/rect placement,
 *  else square-packed over the region. */
export async function placePlant(input: PlacePlantInput): Promise<Holding> {
  const { nodeId, bedId, holdingId, status = 'planned', year, shape = 'area' } = input
  let placed!: Holding
  await db.transaction('rw', db.holdings, db.nodes, db.settings, async () => {
    const node = await db.nodes.get(nodeId)
    const footprint = footprintOf(node)
    const region = input.region ?? { x: 0, y: 0, width: footprint, height: footprint }
    const quantity = placementCount(shape, footprint, region)
    const base = holdingId ? await db.holdings.get(holdingId) : undefined
    placed = {
      ...(base ?? { id: holdingId ?? newId(), nodeId, status }),
      nodeId,
      status: base?.status ?? status,
      bedId,
      region,
      shape,
      footprint,
      quantity,
      ...(year !== undefined ? { year } : {}),
    }
    await db.holdings.put(placed)
    await markUser()
  })
  return placed
}

/** Move/resize a placement to a new region, recomputing the count for its shape. */
export async function movePlacement(holdingId: string, region: Rect): Promise<void> {
  await patchHolding(holdingId, (h) => {
    const footprint = h.footprint ?? region.width
    return { ...h, region, quantity: placementCount(h.shape, footprint, region) }
  })
}

/** Switch a placement between area / round / rect, recomputing its count (a single plant for
 *  round/rect, packed for area). The region is unchanged — the shape only reinterprets it. */
export async function setPlacementShape(holdingId: string, shape: PlacementShape): Promise<void> {
  await patchHolding(holdingId, (h) => {
    if (!h.region) return undefined
    const footprint = h.footprint ?? h.region.width
    return { ...h, shape, quantity: placementCount(shape, footprint, h.region) }
  })
}

/** Hand-override the plant count on a placement (the derived count is only a starting point). */
export async function setQuantity(holdingId: string, quantity: number): Promise<void> {
  await patchHolding(holdingId, (h) => ({ ...h, quantity: Math.max(0, Math.round(quantity)) }))
}

/** Set (or clear) the colour a placement is drawn in on the plot. Pass `undefined` to fall back to
 *  the plant's category colour. */
export async function setPlacementColor(holdingId: string, color: string | undefined): Promise<void> {
  await patchHolding(holdingId, (h) => {
    const { color: _c, ...rest } = h
    return color ? { ...rest, color } : rest
  })
}

/** Take a plant off the plot without deleting the holding (it returns to the flat list). */
export async function unplace(holdingId: string): Promise<void> {
  await patchHolding(holdingId, (h) => {
    const { bedId: _b, region: _r, ...rest } = h
    return rest
  })
}

// --- Plan years -----------------------------------------------------------------------------

/** A holding's effective plan year: its `year`, or `currentYear` when absent (the schema's
 *  "absent = current" — a plot laid out before years were tracked belongs to this year). */
export const yearOf = (h: Holding, currentYear: number): number => h.year ?? currentYear

/** Copy every placement from `fromYear` into `toYear` as fresh *planned* holdings — the "plan next
 *  year off this one" starting point that gives crop rotation a prior year to compare against.
 *  Spatial layout (bed/region/shape/footprint/colour) and the crop carry over; per-instance history
 *  (plantedOn/notes/photos) does not — next year's planting is its own instance. No-op if `toYear`
 *  already has any placement (won't double-clone); returns how many holdings were created. */
export async function rollOverYear(fromYear: number, toYear: number, currentYear: number): Promise<number> {
  let created = 0
  await db.transaction('rw', db.holdings, db.settings, async () => {
    const all = await db.holdings.toArray()
    if (all.some((h) => h.bedId && yearOf(h, currentYear) === toYear)) return
    const source = all.filter((h) => h.bedId && h.region && yearOf(h, currentYear) === fromYear)
    for (const h of source) {
      const { id: _id, plantedOn: _p, notes: _n, photos: _ph, ...rest } = h
      await db.holdings.put({ ...rest, id: newId(), status: 'planned', year: toYear })
      created++
    }
    if (created > 0) await markUser()
  })
  return created
}

/** Each bed's crop-rotation picture for `year` — the rotatable families it holds and any repeating
 *  within the rest window. Reads every year's holdings (the full history) + the reference nodes for
 *  family roll-up. `currentYear` (the year an un-stamped holding counts as) defaults to the clock. */
export async function listRotation(
  year: number,
  opts: { currentYear?: number; restYears?: number } = {},
): Promise<BedRotation[]> {
  const [holdings, nodes, beds] = await Promise.all([db.holdings.toArray(), db.nodes.toArray(), db.beds.toArray()])
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const currentYear = opts.currentYear ?? new Date().getFullYear()
  return rotationForYear(holdings, byId, beds, year, { currentYear, restYears: opts.restYears })
}

/** Each bed's companion-planting picture for `year` — the good/bad pairings among the plants that
 *  share it. `currentYear` (the year an un-stamped holding counts as) defaults to the clock. */
export async function listCompanions(
  year: number,
  opts: { currentYear?: number } = {},
): Promise<BedCompanions[]> {
  const [holdings, nodes] = await Promise.all([db.holdings.toArray(), db.nodes.toArray()])
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const currentYear = opts.currentYear ?? new Date().getFullYear()
  return companionsForYear(holdings, byId, year, { currentYear })
}

// --- Shopping list --------------------------------------------------------------------------

export interface PlantTotal {
  nodeId: string
  quantity: number
}

/** Total plant counts across every placement — the "how many do I need" shopping list. Groups
 *  placed holdings (those with a `bedId`) by node and sums their quantities. */
export async function plotSummary(): Promise<PlantTotal[]> {
  const all = await db.holdings.toArray()
  const totals = new Map<string, number>()
  for (const h of all) {
    if (!h.bedId) continue
    totals.set(h.nodeId, (totals.get(h.nodeId) ?? 0) + (h.quantity ?? 0))
  }
  return [...totals].map(([nodeId, quantity]) => ({ nodeId, quantity }))
}
