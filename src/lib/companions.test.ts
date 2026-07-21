import { describe, it, expect } from 'vitest'
import type { PlantNode } from '../schema/plant'
import type { Holding } from '../schema/userData'
import { companionsForYear, badCompanionBedIds, COMPANION_RULES } from './companions'

// Fixtures spanning the rule shapes: genus↔genus (onion/carrot), genus↔family (onion/legume,
// nasturtium/brassica), and a cultivar that must inherit its genus/family from its species.
const NODES: PlantNode[] = [
  { id: 'onion', rank: 'species', category: 'veg', family: 'Amaryllidaceae', genus: 'Allium' },
  { id: 'carrot', rank: 'species', category: 'veg', family: 'Apiaceae', genus: 'Daucus' },
  { id: 'bean', rank: 'species', category: 'veg', family: 'Fabaceae', genus: 'Phaseolus' },
  { id: 'cabbage', rank: 'species', category: 'veg', family: 'Brassicaceae', genus: 'Brassica' },
  { id: 'kale', rank: 'cultivar', parentId: 'cabbage' }, // inherits Brassicaceae / Brassica
  { id: 'nasturtium', rank: 'species', category: 'flower', family: 'Tropaeolaceae', genus: 'Tropaeolum' },
  { id: 'rose', rank: 'species', category: 'flower', family: 'Rosaceae', genus: 'Rosa' }, // in no rule
]
const byId = new Map(NODES.map((n) => [n.id, n]))

const opts = { currentYear: 2026 }

/** A placed holding of `nodeId` in `bedId` (optionally year-stamped). */
function placed(id: string, nodeId: string, bedId: string, year?: number): Holding {
  return { id, nodeId, status: 'growing', bedId, region: { x: 0, y: 0, width: 1, height: 1 }, ...(year !== undefined ? { year } : {}) }
}

/** The pairing in `bedId` matching a relation and involving both node ids (either side). */
function pairing(list: ReturnType<typeof companionsForYear>, bedId: string, relation: 'good' | 'bad', x: string, y: string) {
  const bed = list.find((b) => b.bedId === bedId)
  return bed?.pairings.find((p) => {
    const ids = new Set([...p.aNodeIds, ...p.bNodeIds])
    return p.relation === relation && ids.has(x) && ids.has(y)
  })
}

describe('companionsForYear', () => {
  it('finds a good pairing among plants sharing a bed', () => {
    const list = companionsForYear([placed('h1', 'onion', 'bed1'), placed('h2', 'carrot', 'bed1')], byId, 2026, opts)
    expect(pairing(list, 'bed1', 'good', 'onion', 'carrot')).toBeDefined()
  })

  it('finds a bad pairing and flags the bed', () => {
    const list = companionsForYear([placed('h1', 'onion', 'bed1'), placed('h2', 'bean', 'bed1')], byId, 2026, opts)
    expect(pairing(list, 'bed1', 'bad', 'onion', 'bean')).toBeDefined()
    expect(badCompanionBedIds(list)).toEqual(new Set(['bed1']))
  })

  it('matches a rule via an inherited genus/family (a cultivar)', () => {
    // kale inherits Brassicaceae; nasturtium (Tropaeolum) is good with brassicas.
    const list = companionsForYear([placed('h1', 'kale', 'bed1'), placed('h2', 'nasturtium', 'bed1')], byId, 2026, opts)
    expect(pairing(list, 'bed1', 'good', 'kale', 'nasturtium')).toBeDefined()
  })

  it('does not pair plants in different beds', () => {
    const list = companionsForYear([placed('h1', 'onion', 'bed1'), placed('h2', 'carrot', 'bed2')], byId, 2026, opts)
    expect(list).toEqual([])
  })

  it('needs the partner present — a lone plant makes no pairing', () => {
    expect(companionsForYear([placed('h1', 'onion', 'bed1')], byId, 2026, opts)).toEqual([])
  })

  it('does not pair a single plant with itself when it matches both sides', () => {
    // A rule keyed category↔category could self-match; our rules don't, but guard the invariant:
    // one carrot alone yields nothing even though it could match either side of a Daucus rule.
    expect(companionsForYear([placed('h1', 'carrot', 'bed1')], byId, 2026, opts)).toEqual([])
  })

  it('ignores plants in no rule', () => {
    expect(companionsForYear([placed('h1', 'rose', 'bed1'), placed('h2', 'carrot', 'bed1')], byId, 2026, opts)).toEqual([])
  })

  it('only considers the queried year', () => {
    const holdings = [placed('h1', 'onion', 'bed1', 2025), placed('h2', 'carrot', 'bed1', 2026)]
    // 2026 has only carrot → no pairing; 2025 has only onion → no pairing.
    expect(companionsForYear(holdings, byId, 2026, opts)).toEqual([])
    expect(companionsForYear(holdings, byId, 2025, opts)).toEqual([])
  })

  it('treats an absent year as the current year', () => {
    const list = companionsForYear([placed('h1', 'onion', 'bed1'), placed('h2', 'carrot', 'bed1')], byId, 2026, opts)
    expect(pairing(list, 'bed1', 'good', 'onion', 'carrot')).toBeDefined()
  })

  it('sorts bad pairings before good within a bed', () => {
    // onion + carrot (good) + bean (bad onion/bean) all in one bed.
    const list = companionsForYear(
      [placed('h1', 'onion', 'bed1'), placed('h2', 'carrot', 'bed1'), placed('h3', 'bean', 'bed1')],
      byId,
      2026,
      opts,
    )
    const relations = list[0].pairings.map((p) => p.relation)
    expect(relations[0]).toBe('bad')
    expect(relations).toContain('good')
  })

  it('ships a non-empty, well-formed ruleset', () => {
    expect(COMPANION_RULES.length).toBeGreaterThan(10)
    for (const r of COMPANION_RULES) {
      expect(r.relation === 'good' || r.relation === 'bad').toBe(true)
      expect(r.a).not.toEqual(r.b)
    }
  })
})
