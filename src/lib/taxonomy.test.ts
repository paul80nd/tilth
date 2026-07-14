import { describe, it, expect } from 'vitest'
import { resolveInherited } from './taxonomy'
import type { PlantNode } from '../schema/plant'

const species: PlantNode = {
  id: 'tomato',
  rank: 'species',
  category: 'veg',
  genus: 'Solanum',
  calendar: [{ code: 'sow-indoors', months: [3, 4] }],
  conditions: { sun: ['full-sun'] },
  facts: { spacing: '45cm' },
  provenance: {
    calendar: { source: 'plant-db' },
    conditions: { source: 'plant-db' },
    facts: { source: 'plant-db' },
  },
}

const cultivar: PlantNode = {
  id: 't-sb',
  rank: 'cultivar',
  parentId: 'tomato',
  variety: 'Sunny Bench',
  facts: { fruit: 'cherry' },
  provenance: { facts: { source: 'seed-packet' } },
}

describe('resolveInherited', () => {
  it('fills absent fields from the nearest ancestor and records the source', () => {
    const { node, inheritedFrom } = resolveInherited(cultivar, [species])
    expect(node.calendar).toEqual(species.calendar)
    expect(node.conditions).toEqual(species.conditions)
    expect(node.category).toBe('veg')
    expect(inheritedFrom.calendar).toBe(species)
    expect(inheritedFrom.category).toBe(species)
  })

  it("keeps the node's own field and does not mark it inherited (whole-field, no merge)", () => {
    const { node, inheritedFrom } = resolveInherited(cultivar, [species])
    // Own facts win wholesale — the species' spacing is NOT merged in.
    expect(node.facts).toEqual({ fruit: 'cherry' })
    expect(inheritedFrom.facts).toBeUndefined()
  })

  it('does not mutate the input node', () => {
    const before = JSON.stringify(cultivar)
    resolveInherited(cultivar, [species])
    expect(JSON.stringify(cultivar)).toBe(before)
  })

  it('leaves fields no ancestor has as absent', () => {
    const { node } = resolveInherited(cultivar, [species])
    expect(node.size).toBeUndefined()
  })
})
