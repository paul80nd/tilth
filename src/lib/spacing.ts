// Pure spacing maths for the garden planner: how much room one plant needs (its footprint) and
// how many fit a bed region. No Dexie/IO — the app seam (src/app/garden.ts) supplies the node and
// stores the derived count. See docs/garden-planner-spec.md.
//
// Packing model: simple SQUARE packing — floor(width/footprint) × floor(height/footprint). This
// under-counts vs the staggered/hex packing square-foot gardening assumes, so counts are
// conservative (you'll never be told to cram more in than fits). Documented approximation; revisit
// if counts feel low.

import type { PlantNode } from '../schema/plant'
import type { PlacementShape } from '../schema/userData'
import { parseLength } from './size'

/** Fallback footprint (metres) when a plant tells us nothing about its spacing. A sensible
 *  small-plant default so a placement still yields a count. */
export const DEFAULT_FOOTPRINT = 0.3

/** Nudge before flooring: at garden scale, `0.3 / 0.05` is `5.9999…` in binary, which would
 *  floor to 5. This epsilon (far below a millimetre) recovers the intended whole division. */
const FLOOR_EPS = 1e-9

/** A rectangular region in metres (bed-local). Structurally matches `Rect` elsewhere. */
export interface Region {
  width: number
  height: number
}

/** The spacing footprint (diameter in metres) for a plant — how much room one specimen needs.
 *  Prefers an explicit spacing fact (the seed-packet half of the merge), else the node's ultimate
 *  spread, else {@link DEFAULT_FOOTPRINT}. */
export function footprintOf(node?: Pick<PlantNode, 'facts' | 'size'>): number {
  const fromFact = spacingFact(node?.facts)
  if (fromFact && fromFact > 0) return fromFact
  const spread = parseLength(node?.size?.spread)
  if (spread && spread.max > 0) return spread.max
  return DEFAULT_FOOTPRINT
}

/** Pull a spacing distance (metres) from the free `facts` chips, if one names spacing. Matches
 *  keys like "spacing", "plant spacing", "row spacing"; parses the value like any length. */
function spacingFact(facts?: Record<string, string>): number | undefined {
  if (!facts) return undefined
  const entry = Object.entries(facts).find(([k]) => /spac/i.test(k))
  if (!entry) return undefined
  return parseLength(entry[1])?.max
}

/** How many plants of a given footprint fit a region — square packing, never negative. A region
 *  narrower/shorter than one footprint fits none (the app sizes a single placement to at least a
 *  footprint, so a real placement is always ≥ 1). */
export function plantsInRegion(footprintM: number, region: Region): number {
  if (footprintM <= 0) return 0
  const cols = Math.floor(region.width / footprintM + FLOOR_EPS)
  const rows = Math.floor(region.height / footprintM + FLOOR_EPS)
  return Math.max(0, cols * rows)
}

/** How many plants a placement holds. An `area` packs its region at the footprint (at least one
 *  for a real placement); a single `round`/`rect` placement is always exactly one plant. */
export function placementCount(shape: PlacementShape | undefined, footprintM: number, region: Region): number {
  if (shape === 'round' || shape === 'rect') return 1
  return Math.max(1, plantsInRegion(footprintM, region))
}

/** Plants per square-foot grid cell for a crop — the SFG density label. A cell holds
 *  floor(cell/footprint)² plants, but at least 1 (a plant bigger than a cell takes the whole cell,
 *  and spans more when the region is larger — handled by {@link plantsInRegion} over the region). */
export function plantsPerCell(footprintM: number, cellM: number): number {
  if (footprintM <= 0 || cellM <= 0) return 0
  const perSide = Math.floor(cellM / footprintM + FLOOR_EPS)
  return Math.max(1, perSide * perSide)
}
