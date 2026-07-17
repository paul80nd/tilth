import { describe, expect, it } from 'vitest'
import { buildForest, flattenVisible, allIds, resolveAll, linkedAncestor } from './tree'
import type { PlantNode } from '../schema/plant'

const nodes: PlantNode[] = [
  { id: 'rosaceae', rank: 'family', botanicalName: 'Rosaceae', family: 'Rosaceae' },
  { id: 'malus', rank: 'genus', parentId: 'rosaceae', botanicalName: 'Malus', genus: 'Malus', conditions: { hardiness: 'H6' } },
  { id: 'malus-domestica', rank: 'species', parentId: 'malus', commonName: 'Apple', category: 'fruit' },
  { id: 'malus-domestica-red-falstaff', rank: 'cultivar', parentId: 'malus-domestica', commonName: 'Apple', variety: 'Red Falstaff' },
  { id: 'floating', rank: 'cultivar', commonName: 'Orphan' }, // parent absent → a root
]

describe('buildForest', () => {
  it('nests by parentId and records depth; a node with an absent parent roots', () => {
    const forest = buildForest(nodes)
    // Roots: rosaceae + floating, sorted by name (Apple? no — Orphan vs Rosaceae) → alphabetical.
    expect(forest.map((t) => t.node.id).sort()).toEqual(['floating', 'rosaceae'])
    const rosaceae = forest.find((t) => t.node.id === 'rosaceae')!
    expect(rosaceae.depth).toBe(0)
    const malus = rosaceae.children[0]
    expect(malus.node.id).toBe('malus')
    expect(malus.depth).toBe(1)
    expect(malus.children[0].node.id).toBe('malus-domestica')
    expect(malus.children[0].children[0].node.id).toBe('malus-domestica-red-falstaff')
  })
})

describe('flattenVisible', () => {
  it('shows a node\'s children only when it is expanded', () => {
    const forest = buildForest(nodes)
    const collapsed = flattenVisible(forest, new Set())
    expect(collapsed.map((t) => t.node.id).sort()).toEqual(['floating', 'rosaceae'])
    const expanded = flattenVisible(forest, new Set(allIds(forest)))
    expect(expanded).toHaveLength(5)
  })
})

describe('resolveAll', () => {
  it('fills each node\'s inherited fields from its ancestor chain', () => {
    const resolved = resolveAll(nodes)
    const cultivar = resolved.get('malus-domestica-red-falstaff')!
    expect(cultivar.node.category).toBe('fruit') // from species
    expect(cultivar.node.conditions?.hardiness).toBe('H6') // from genus, two hops up
    expect(cultivar.inheritedFrom.conditions?.id).toBe('malus')
  })
})

describe('linkedAncestor', () => {
  const byId = new Map(nodes.map((n) => [n.id, n]))

  it('returns null when no ancestor carries a source link', () => {
    const cultivar = nodes.find((n) => n.id === 'malus-domestica-red-falstaff')!
    expect(linkedAncestor(cultivar, byId)).toBeNull()
  })

  it('finds the nearest ancestor that has its own sourceLinks', () => {
    const linked = new Map(byId)
    linked.set('malus-domestica', {
      ...byId.get('malus-domestica')!,
      sourceLinks: [{ source: 'rhs', url: 'https://example.invalid/apple' }],
    })
    const cultivar = linked.get('malus-domestica-red-falstaff')!
    expect(linkedAncestor(cultivar, linked)?.id).toBe('malus-domestica')
  })

  it('ignores the node\'s own links (only looks upward)', () => {
    const own = { ...nodes.find((n) => n.id === 'malus-domestica')!, sourceLinks: [{ source: 'rhs', url: 'https://example.invalid/apple' }] }
    // species has its own link but no linked ancestor above it
    expect(linkedAncestor(own, new Map(nodes.map((n) => [n.id, n])).set(own.id, own))).toBeNull()
  })
})
