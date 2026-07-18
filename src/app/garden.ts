// Application layer: the garden-planner use-cases — the seam the plot canvas UI and the Gherkin
// feature tests both drive (React stays a thin shell; behaviour is tested here against
// fake-indexeddb). Beds are a new store; a plant placed on a bed IS a holding that gains spatial
// fields (see docs/decisions.md), so placing/moving a plant reads/writes the `holdings` store.
//
// Pure maths (footprint, count, geometry) lives in src/lib/spacing.ts + src/lib/plot.ts; this
// module only orchestrates Dexie and marks the store user-owned so the demo re-seed can't clobber
// a real garden.

import { db } from '../db/db'
import type { Bed, Holding, Rect } from '../schema/userData'
import { footprintOf, plantsInRegion } from '../lib/spacing'

/** Fresh id for a hand-created bed/holding. `crypto.randomUUID` is available in every target
 *  (evergreen browsers, Node ≥22, the test env). */
function newId(): string {
  return crypto.randomUUID()
}

/** Mark the working store as the user's own — guards a real garden from the first-run demo
 *  re-seed, exactly as the import/backup paths do. */
async function markUser(): Promise<void> {
  await db.settings.put({ key: 'dataSource', value: 'user' })
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

export function holdingsInBed(bedId: string): Promise<Holding[]> {
  return db.holdings.where('bedId').equals(bedId).toArray()
}

// --- Placements (a placement is a holding) --------------------------------------------------

export interface PlacePlantInput {
  nodeId: string
  bedId: string
  /** The block occupied within the bed (bed-local metres). Defaults to a single footprint. */
  region?: Rect
  /** Reuse an existing holding (e.g. placing a wishlist entry) instead of creating one. */
  holdingId?: string
  status?: Holding['status']
  year?: number
}

/** Place a plant on a bed: create (or update) a holding with a derived footprint + count. The
 *  footprint comes from the reference node; the count is square-packed over the region. */
export async function placePlant(input: PlacePlantInput): Promise<Holding> {
  const { nodeId, bedId, holdingId, status = 'planned', year } = input
  let placed!: Holding
  await db.transaction('rw', db.holdings, db.nodes, db.settings, async () => {
    const node = await db.nodes.get(nodeId)
    const footprint = footprintOf(node)
    const region = input.region ?? { x: 0, y: 0, width: footprint, height: footprint }
    const quantity = Math.max(1, plantsInRegion(footprint, region))
    const base = holdingId ? await db.holdings.get(holdingId) : undefined
    placed = {
      ...(base ?? { id: holdingId ?? newId(), nodeId, status }),
      nodeId,
      status: base?.status ?? status,
      bedId,
      region,
      footprint,
      quantity,
      ...(year !== undefined ? { year } : {}),
    }
    await db.holdings.put(placed)
    await markUser()
  })
  return placed
}

/** Move/resize a placement to a new region, recomputing the count from its footprint. */
export async function movePlacement(holdingId: string, region: Rect): Promise<void> {
  await db.transaction('rw', db.holdings, db.settings, async () => {
    const h = await db.holdings.get(holdingId)
    if (!h) return
    const footprint = h.footprint ?? region.width
    const quantity = Math.max(1, plantsInRegion(footprint, region))
    await db.holdings.put({ ...h, region, quantity })
    await markUser()
  })
}

/** Hand-override the plant count on a placement (the derived count is only a starting point). */
export async function setQuantity(holdingId: string, quantity: number): Promise<void> {
  await db.transaction('rw', db.holdings, db.settings, async () => {
    const h = await db.holdings.get(holdingId)
    if (!h) return
    await db.holdings.put({ ...h, quantity: Math.max(0, Math.round(quantity)) })
    await markUser()
  })
}

/** Take a plant off the plot without deleting the holding (it returns to the flat list). */
export async function unplace(holdingId: string): Promise<void> {
  await db.transaction('rw', db.holdings, db.settings, async () => {
    const h = await db.holdings.get(holdingId)
    if (!h) return
    const { bedId: _b, region: _r, ...rest } = h
    await db.holdings.put(rest)
    await markUser()
  })
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
