import { describe, expect, it } from 'vitest'
import { makeNode } from '../../test/factories'
import { localTaxonomy } from './neighbourhood'

// Family Rosaceae → genus Malus → species Apple (2 cultivars) + species Crab apple (1 cultivar),
// plus an unrelated genus to prove the neighbourhood stays within Malus.
const nodes = [
  makeNode({ id: 'rosaceae', rank: 'family', botanicalName: 'Rosaceae' }),
  makeNode({ id: 'malus', rank: 'genus', parentId: 'rosaceae', botanicalName: 'Malus' }),
  makeNode({ id: 'apple', rank: 'species', parentId: 'malus', commonName: 'Apple' }),
  makeNode({ id: 'apple-red', rank: 'cultivar', parentId: 'apple', commonName: 'Apple', variety: 'Redglow' }),
  makeNode({ id: 'apple-sweet', rank: 'cultivar', parentId: 'apple', commonName: 'Apple', variety: 'Sweetcrop' }),
  makeNode({ id: 'crab', rank: 'species', parentId: 'malus', commonName: 'Crab apple' }),
  makeNode({ id: 'crab-john', rank: 'cultivar', parentId: 'crab', commonName: 'Crab apple', variety: 'John Downie' }),
  makeNode({ id: 'rosa', rank: 'genus', parentId: 'rosaceae', botanicalName: 'Rosa' }),
  makeNode({ id: 'rose-a', rank: 'cultivar', parentId: 'rosa', commonName: 'Rose', variety: 'Peace' }),
]

describe('localTaxonomy', () => {
  it('anchors on the genus in a cultivar’s lineage and lists the whole genus subtree', () => {
    const n = localTaxonomy(nodes, 'apple-red')!
    expect(n.family?.id).toBe('rosaceae')
    expect(n.genus.id).toBe('malus')
    // species sorted by name: Apple, Crab apple — and only Malus, not Rosa
    expect(n.entries.map((e) => e.node.id)).toEqual(['apple', 'crab'])
    expect(n.entries[0].children.map((c) => c.id)).toEqual(['apple-red', 'apple-sweet'])
    expect(n.entries[1].children.map((c) => c.id)).toEqual(['crab-john'])
  })

  it('gives the same neighbourhood when anchored from the species or the genus itself', () => {
    expect(localTaxonomy(nodes, 'apple')!.genus.id).toBe('malus')
    expect(localTaxonomy(nodes, 'malus')!.entries.map((e) => e.node.id)).toEqual(['apple', 'crab'])
  })

  it('lists a cultivar hanging directly off the genus as a childless entry', () => {
    const n = localTaxonomy(nodes, 'rose-a')!
    expect(n.genus.id).toBe('rosa')
    expect(n.entries).toEqual([expect.objectContaining({ node: expect.objectContaining({ id: 'rose-a' }), children: [] })])
  })

  it('returns undefined when there is no genus to anchor on (a family, or a floating node)', () => {
    expect(localTaxonomy(nodes, 'rosaceae')).toBeUndefined()
    expect(localTaxonomy(nodes, 'nope')).toBeUndefined()
    expect(localTaxonomy([makeNode({ id: 'lonely', rank: 'species' })], 'lonely')).toBeUndefined()
  })
})
