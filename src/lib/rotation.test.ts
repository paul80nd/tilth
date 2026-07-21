import { describe, it, expect } from 'vitest'
import type { PlantNode } from '../schema/plant'
import type { Bed, Holding } from '../schema/userData'
import { rotationForYear, warnBedIds, ROTATION_REST_YEARS, type RotationOptions } from './rotation'

// A small taxonomy: two brassicas (a cabbage species + a kale cultivar under it), a carrot, a
// perennial-only veg (rhubarb) and a fruit (apple) — enough to exercise family roll-up, the veg
// filter and the perennial exclusion.
const NODES: PlantNode[] = [
  { id: 'brassica-oleracea', rank: 'species', category: 'veg', family: 'Brassicaceae', lifecycle: ['biennial'] },
  { id: 'kale-cavolo', rank: 'cultivar', parentId: 'brassica-oleracea' }, // inherits veg + Brassicaceae
  { id: 'daucus-carota', rank: 'species', category: 'veg', family: 'Apiaceae', lifecycle: ['annual'] },
  { id: 'pisum-sativum', rank: 'species', category: 'veg', family: 'Fabaceae', lifecycle: ['annual'] },
  { id: 'rheum', rank: 'species', category: 'veg', family: 'Polygonaceae', lifecycle: ['perennial'] },
  { id: 'malus-domestica', rank: 'species', category: 'fruit', family: 'Rosaceae', lifecycle: ['perennial'] },
]
const byId = new Map(NODES.map((n) => [n.id, n]))

/** A bed of a given kind (soil bed by default), sized 1×1. */
function bed(id: string, kind: Bed['kind'] = 'raised-bed'): Bed {
  return { id, name: id, kind, x: 0, y: 0, width: 1, height: 1, spacing: 'free' }
}
// The default plot: two soil beds, so bed-kind gating is a no-op unless a test overrides it.
const BEDS: Bed[] = [bed('bed1'), bed('bed2')]

/** Terse holding factory — a placed holding of `nodeId` in `bedId` for a given `year`. */
function placed(id: string, nodeId: string, bedId: string, year?: number): Holding {
  return { id, nodeId, status: 'growing', bedId, region: { x: 0, y: 0, width: 1, height: 1 }, ...(year !== undefined ? { year } : {}) }
}

const opts: RotationOptions = { currentYear: 2026 }

/** rotationForYear against the default soil beds (most tests don't vary the plot). */
function rot(holdings: Holding[], year: number, o = opts, beds: Bed[] = BEDS) {
  return rotationForYear(holdings, byId, beds, year, o)
}

describe('rotationForYear', () => {
  it('flags a family repeated within the rest window', () => {
    const holdings = [
      placed('h1', 'brassica-oleracea', 'bed1', 2025),
      placed('h2', 'kale-cavolo', 'bed1', 2026), // a cultivar → still Brassicaceae, so it repeats
    ]
    const r = rot(holdings, 2026)
    expect(r).toHaveLength(1)
    expect(r[0].bedId).toBe('bed1')
    expect(r[0].conflicts).toHaveLength(1)
    const c = r[0].conflicts[0]
    expect(c).toMatchObject({ family: 'Brassicaceae', lastYear: 2025, yearsAgo: 1 })
    expect(c.holdingIds).toEqual(['h2']) // this year's holding of the family
  })

  it('does not flag a different family following in the same bed', () => {
    const holdings = [
      placed('h1', 'brassica-oleracea', 'bed1', 2025),
      placed('h2', 'daucus-carota', 'bed1', 2026),
    ]
    const r = rot(holdings, 2026)
    expect(r[0].conflicts).toEqual([])
    expect(r[0].families).toEqual(['Apiaceae'])
  })

  it('does not flag the same family in a different bed', () => {
    const holdings = [
      placed('h1', 'brassica-oleracea', 'bed1', 2025),
      placed('h2', 'brassica-oleracea', 'bed2', 2026),
    ]
    expect(warnBedIds(rot(holdings, 2026)).size).toBe(0)
  })

  it('respects the rest window: a gap longer than restYears is clean', () => {
    const holdings = [
      placed('h1', 'brassica-oleracea', 'bed1', 2022), // 4 years before 2026, outside the 3-yr window
      placed('h2', 'brassica-oleracea', 'bed1', 2026),
    ]
    expect(rot(holdings, 2026)[0].conflicts).toEqual([])
  })

  it('reports the most recent prior year when a family repeats across several', () => {
    const holdings = [
      placed('h1', 'brassica-oleracea', 'bed1', 2024),
      placed('h2', 'brassica-oleracea', 'bed1', 2025),
      placed('h3', 'brassica-oleracea', 'bed1', 2026),
    ]
    expect(rot(holdings, 2026)[0].conflicts[0]).toMatchObject({ lastYear: 2025, yearsAgo: 1 })
  })

  it('honours a custom rest window', () => {
    const holdings = [
      placed('h1', 'brassica-oleracea', 'bed1', 2025),
      placed('h2', 'brassica-oleracea', 'bed1', 2026),
    ]
    // restYears: 0 → no earlier years are in range, so nothing conflicts.
    expect(rot(holdings, 2026, { ...opts, restYears: 0 })[0].conflicts).toEqual([])
  })

  it('treats an absent year as the current year', () => {
    const holdings = [
      placed('h1', 'brassica-oleracea', 'bed1', 2025),
      placed('h2', 'brassica-oleracea', 'bed1'), // no year ⇒ 2026 (currentYear)
    ]
    expect(rot(holdings, 2026)[0].conflicts[0]).toMatchObject({ family: 'Brassicaceae', lastYear: 2025 })
  })

  it('ignores non-veg holdings (perennials stay put — no rotation)', () => {
    const holdings = [
      placed('h1', 'malus-domestica', 'bed1', 2025),
      placed('h2', 'malus-domestica', 'bed1', 2026),
    ]
    expect(rot(holdings, 2026)).toEqual([])
  })

  it('ignores a perennial-only veg but keeps annual/biennial veg', () => {
    const holdings = [
      placed('r1', 'rheum', 'bed1', 2025),
      placed('r2', 'rheum', 'bed1', 2026), // perennial-only veg → excluded, no conflict
      placed('c1', 'daucus-carota', 'bed2', 2025),
      placed('c2', 'daucus-carota', 'bed2', 2026), // annual veg → included, conflicts
    ]
    expect(warnBedIds(rot(holdings, 2026))).toEqual(new Set(['bed2']))
  })

  it('only warns in soil beds — a container/patio/structure bed is exempt', () => {
    const holdings = [
      placed('c1', 'brassica-oleracea', 'pot', 2025),
      placed('c2', 'brassica-oleracea', 'pot', 2026), // same family, but it's a container
      placed('b1', 'brassica-oleracea', 'bed1', 2025),
      placed('b2', 'brassica-oleracea', 'bed1', 2026), // same family in a soil bed → warns
    ]
    const beds = [bed('pot', 'container'), bed('bed1')]
    expect(warnBedIds(rot(holdings, 2026, opts, beds))).toEqual(new Set(['bed1']))
  })

  it('includes a greenhouse but not a coldframe', () => {
    const holdings = [
      placed('g1', 'brassica-oleracea', 'glass', 2025),
      placed('g2', 'brassica-oleracea', 'glass', 2026),
      placed('f1', 'brassica-oleracea', 'frame', 2025),
      placed('f2', 'brassica-oleracea', 'frame', 2026),
    ]
    const beds = [bed('glass', 'greenhouse'), bed('frame', 'coldframe')]
    expect(warnBedIds(rot(holdings, 2026, opts, beds))).toEqual(new Set(['glass']))
  })

  it('skips a holding in a bed that no longer exists', () => {
    const holdings = [
      placed('h1', 'brassica-oleracea', 'ghost', 2025),
      placed('h2', 'brassica-oleracea', 'ghost', 2026),
    ]
    expect(rot(holdings, 2026, opts, [])).toEqual([])
  })

  it('skips holdings whose family is unknown', () => {
    const orphan: Holding = placed('o1', 'no-such-node', 'bed1', 2026)
    expect(rot([orphan], 2026)).toEqual([])
  })

  it('skips a placement that has no bed (unplaced holding)', () => {
    const unplaced: Holding = { id: 'u1', nodeId: 'brassica-oleracea', status: 'growing', year: 2026 }
    expect(rot([unplaced], 2026)).toEqual([])
  })

  it('lists a clean bed with families but no conflicts', () => {
    expect(rot([placed('h1', 'daucus-carota', 'bed1', 2026)], 2026)).toEqual([
      { bedId: 'bed1', families: ['Apiaceae'], conflicts: [] },
    ])
  })

  it('only considers the target year for what is planted now', () => {
    // Brassicas in 2025 and 2027, but 2026 holds only carrots → no conflict for 2026.
    const holdings = [
      placed('h1', 'brassica-oleracea', 'bed1', 2025),
      placed('h2', 'daucus-carota', 'bed1', 2026),
      placed('h3', 'brassica-oleracea', 'bed1', 2027),
    ]
    expect(rot(holdings, 2026)[0].conflicts).toEqual([])
  })

  it('exposes a sensible default rest window', () => {
    expect(ROTATION_REST_YEARS).toBe(3)
  })
})
