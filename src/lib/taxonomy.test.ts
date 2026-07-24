import { describe, it, expect } from 'vitest'
import { resolveInherited } from './taxonomy'
import type { PlantNode } from '../schema/plant'

const species: PlantNode = {
  id: 'tomato',
  rank: 'species',
  category: 'veg',
  genus: 'Solanum',
  calendar: [{ code: 'sow-indoors', months: [3, 4] }],
  conditions: { moisture: ['moist'] },
  position: { sun: ['full-sun'] },
  facts: { spacing: '45cm' },
  provenance: {
    calendar: { source: 'plant-db' },
    conditions: { source: 'plant-db' },
    position: { source: 'plant-db' },
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

  it('inherits position and conditions independently (each is its own field)', () => {
    // A cultivar that owns its OWN conditions still inherits position from the species, and vice
    // versa — the whole point of splitting the two.
    const ownConditions: PlantNode = {
      id: 't-oc',
      rank: 'cultivar',
      parentId: 'tomato',
      conditions: { soil: ['chalk'] },
      provenance: { conditions: { source: 'manual' } },
    }
    const { node, inheritedFrom } = resolveInherited(ownConditions, [species])
    expect(node.conditions).toEqual({ soil: ['chalk'] }) // own — not inherited
    expect(inheritedFrom.conditions).toBeUndefined()
    expect(node.position).toEqual(species.position) // still borrowed from the species
    expect(inheritedFrom.position).toBe(species)
  })

  it('merges facts per key — own chips win, the rest are inherited', () => {
    const { node, inheritedFrom, factsFrom } = resolveInherited(cultivar, [species])
    // The cultivar owns {fruit}; the species' {spacing} still shows — merged, nearest wins per key.
    expect(node.facts).toEqual({ spacing: '45cm', fruit: 'cherry' })
    // Not a whole-field inherit (the node owns a chip), so no "from {ancestor}" note…
    expect(inheritedFrom.facts).toBeUndefined()
    // …but the inherited chip records its origin, and the node's own chip does not.
    expect(factsFrom.spacing).toBe(species)
    expect(factsFrom.fruit).toBeUndefined()
  })

  it('marks facts whole-field inherited only when the node owns no chips', () => {
    const noFacts: PlantNode = { id: 't-nf', rank: 'cultivar', parentId: 'tomato' }
    const { node, inheritedFrom, factsFrom } = resolveInherited(noFacts, [species])
    expect(node.facts).toEqual({ spacing: '45cm' })
    expect(inheritedFrom.facts).toBe(species) // whole field borrowed — the note is truthful
    expect(factsFrom.spacing).toBe(species)
  })

  it('merges facts across multiple levels — nearest wins per key', () => {
    const genus: PlantNode = {
      id: 'solanum',
      rank: 'genus',
      facts: { spacing: '60cm', family: 'Solanaceae', water: 'regular' },
    }
    const speciesOverride: PlantNode = {
      id: 'tomato',
      rank: 'species',
      parentId: 'solanum',
      facts: { spacing: '45cm', water: 'daily' },
    }
    // cultivar owns {fruit}; ancestors nearest-first are [species, genus].
    const { node, factsFrom } = resolveInherited(cultivar, [speciesOverride, genus])
    expect(node.facts).toEqual({
      fruit: 'cherry', // own
      spacing: '45cm', // species beats genus
      water: 'daily', // species beats genus
      family: 'Solanaceae', // only the genus has it
    })
    expect(factsFrom.spacing).toBe(speciesOverride)
    expect(factsFrom.family).toBe(genus)
    expect(factsFrom.fruit).toBeUndefined() // own chip
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

  it('inherits the descriptive fields (seasonalInterest, edible, wildlife, uses)', () => {
    const parent: PlantNode = {
      ...species,
      seasonalInterest: { summer: { flower: ['yellow'] } },
      edible: ['fruit'],
      wildlife: ['attracts pollinators'],
      uses: ['containers'],
    }
    const { node, inheritedFrom } = resolveInherited(cultivar, [parent])
    expect(node.seasonalInterest).toEqual({ summer: { flower: ['yellow'] } })
    expect(node.edible).toEqual(['fruit'])
    expect(node.wildlife).toEqual(['attracts pollinators'])
    expect(inheritedFrom.edible).toBe(parent)
  })

  it('does not inherit awards — they are an own-only accolade', () => {
    const decorated: PlantNode = { ...species, awards: ['Species Award'] }
    const { node, inheritedFrom } = resolveInherited(cultivar, [decorated])
    expect(node.awards).toBeUndefined()
    expect(inheritedFrom.awards).toBeUndefined()
  })
})
