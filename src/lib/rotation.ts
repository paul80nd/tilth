// Pure crop-rotation engine. Crop rotation is the discipline of not growing the same botanical
// FAMILY in the same bed too often — pests and diseases that specialise on a family build up in the
// soil, and each family draws the same nutrients. The fix costs no new plant data: every node
// already carries (or inherits) a `family`, so we just compare, per bed, the families grown across
// years and flag one that returns before it has rested.
//
// Rotation is an ANNUAL-VEG discipline: you don't rotate a fruit tree, a shrub, or a perennial herb
// (they stay put), so only veg-category, not-exclusively-perennial holdings are considered — a
// permanent apple or rosemary bed never warns. A holding's year is `holding.year`, or `currentYear`
// when absent (the schema's "absent = current"), so a plot laid out before years were tracked reads
// as this year's.
//
// Pure: no Dexie, no I/O. The garden page fetches holdings + nodes and calls in (like jobs.ts).

import type { LifecycleCode, PlantNode } from '../schema/plant'
import type { Bed, Holding } from '../schema/userData'

/** How many years a botanical family should ideally rest before returning to a bed. A family grown
 *  in the target year warns if it also grew there within the previous {@link ROTATION_REST_YEARS}
 *  years — the classic four-bed rotation rests each group ~3 years. This is the future settings
 *  seam: a per-garden override would replace the constant. `restYears: 1` is plain consecutive-year. */
export const ROTATION_REST_YEARS = 3

/** Bed kinds crop rotation applies to — those that share persistent soil from one year to the next.
 *  Excluded: `container`/`patio` (pots on hard standing get fresh compost each time, so nothing
 *  carries over), `coldframe` (usually pots/seedlings) and `structure` (a bed you don't plant in).
 *  A greenhouse is included — its border soil builds up soil-borne disease exactly like open ground. */
export const ROTATING_BED_KINDS: ReadonlySet<Bed['kind']> = new Set<Bed['kind']>([
  'bed',
  'raised-bed',
  'border',
  'greenhouse',
])

/** A botanical family that returns to a bed too soon — grown in the target year AND within the
 *  rest window before it. */
export interface RotationConflict {
  /** The repeating botanical family (e.g. "Brassicaceae"). */
  family: string
  /** The most recent earlier year the family was grown in this bed (within the rest window). */
  lastYear: number
  /** How many years ago that was (target year − lastYear); 1 = the immediately preceding year. */
  yearsAgo: number
  /** The target-year holdings of that family in this bed — so the plot can highlight them. */
  holdingIds: string[]
}

/** A bed's rotation picture for a target year: the (rotatable) families planted in it, and any that
 *  repeat too soon. `conflicts` empty ⇒ the bed is rotating cleanly. */
export interface BedRotation {
  bedId: string
  /** Rotatable families planted in the bed in the target year (sorted). */
  families: string[]
  conflicts: RotationConflict[]
}

export interface RotationOptions {
  /** The year an absent `holding.year` counts as (the schema's "absent = current"). */
  currentYear: number
  /** Rest window in years (default {@link ROTATION_REST_YEARS}). */
  restYears?: number
}

/** The nearest own-or-inherited value of `field` up a node's ancestor chain (guards a broken
 *  parent cycle), mirroring the roll-up the cheatsheet and jobs engine use. */
function resolveField<K extends keyof PlantNode>(
  startId: string,
  byId: Map<string, PlantNode>,
  field: K,
): PlantNode[K] | undefined {
  let current = byId.get(startId)
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    if (current[field] !== undefined) return current[field]
    seen.add(current.id)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return undefined
}

/** Does this holding take part in rotation? Only veg that isn't *exclusively* perennial — a plant
 *  that can be grown as an annual (lifecycle unknown, or listing annual/biennial among its cycles)
 *  rotates; a perennial-only veg (rhubarb, asparagus) stays put and is excluded. */
function isRotatable(nodeId: string, byId: Map<string, PlantNode>): boolean {
  if (resolveField(nodeId, byId, 'category') !== 'veg') return false
  const lifecycle = resolveField(nodeId, byId, 'lifecycle') as LifecycleCode[] | undefined
  if (lifecycle && lifecycle.length > 0 && lifecycle.every((l) => l === 'perennial')) return false
  return true
}

/**
 * Build each bed's rotation picture for `year`: which rotatable families it holds, and any that
 * broke the rest window (grown here again within the previous `restYears`). Only soil beds (see
 * {@link ROTATING_BED_KINDS}) holding at least one rotatable family in the target year appear.
 *
 * A holding contributes only if its family is known (own-or-inherited) — rotation can't reason
 * about a plant whose family we don't hold yet, so it's silently skipped.
 */
export function rotationForYear(
  holdings: Holding[],
  nodesById: Map<string, PlantNode>,
  beds: Bed[],
  year: number,
  options: RotationOptions,
): BedRotation[] {
  const restYears = options.restYears ?? ROTATION_REST_YEARS
  const { currentYear } = options
  // Only beds whose kind carries soil year to year take part; a pot/patio/structure bed is out.
  const rotatingBedIds = new Set(beds.filter((b) => ROTATING_BED_KINDS.has(b.kind)).map((b) => b.id))

  // Per bed: which families were grown in each year, and (for the target year) the holdings behind
  // each family so a conflict can point at them.
  const familiesByBedYear = new Map<string, Map<number, Set<string>>>()
  const targetHoldings = new Map<string, Map<string, string[]>>()

  for (const h of holdings) {
    if (!h.bedId || !rotatingBedIds.has(h.bedId)) continue
    const family = resolveField(h.nodeId, nodesById, 'family')
    if (!family || !isRotatable(h.nodeId, nodesById)) continue

    const hYear = h.year ?? currentYear
    let years = familiesByBedYear.get(h.bedId)
    if (!years) familiesByBedYear.set(h.bedId, (years = new Map()))
    let fams = years.get(hYear)
    if (!fams) years.set(hYear, (fams = new Set()))
    fams.add(family)

    if (hYear === year) {
      let byFamily = targetHoldings.get(h.bedId)
      if (!byFamily) targetHoldings.set(h.bedId, (byFamily = new Map()))
      const ids = byFamily.get(family)
      if (ids) ids.push(h.id)
      else byFamily.set(family, [h.id])
    }
  }

  const result: BedRotation[] = []
  for (const [bedId, years] of familiesByBedYear) {
    const targetFams = years.get(year)
    if (!targetFams || targetFams.size === 0) continue
    const families = [...targetFams].sort()
    const conflicts: RotationConflict[] = []
    for (const family of families) {
      // The most recent earlier year within [year - restYears, year - 1] that grew this family.
      let lastYear: number | undefined
      for (let y = year - 1; y >= year - restYears; y--) {
        if (years.get(y)?.has(family)) {
          lastYear = y
          break
        }
      }
      if (lastYear !== undefined) {
        conflicts.push({
          family,
          lastYear,
          yearsAgo: year - lastYear,
          holdingIds: [...(targetHoldings.get(bedId)?.get(family) ?? [])].sort(),
        })
      }
    }
    result.push({ bedId, families, conflicts })
  }
  result.sort((a, b) => a.bedId.localeCompare(b.bedId))
  return result
}

/** The bed ids with at least one rotation conflict in a rotation set — the plot's warning set. */
export function warnBedIds(rotations: BedRotation[]): Set<string> {
  return new Set(rotations.filter((r) => r.conflicts.length > 0).map((r) => r.bedId))
}
