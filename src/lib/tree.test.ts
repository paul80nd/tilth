import { describe, expect, it } from 'vitest'
import { buildForest, flattenVisible, allIds, resolveAll, linkedAncestor, withUnplacedBucket, isBannerRow, flatPlants, UNKNOWN_FAMILY_ID, UNKNOWN_GENUS_ID } from './tree'
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

describe('isBannerRow', () => {
  const forest = buildForest(nodes)
  const all = flattenVisible(forest, new Set(allIds(forest)))
  const find = (id: string) => all.find((t) => t.node.id === id)!

  it('a family/genus WITH children is a banner', () => {
    expect(isBannerRow(find('rosaceae'))).toBe(true)
    expect(isBannerRow(find('malus'))).toBe(true)
  })
  it('a species (even with cultivar children) is NOT a banner', () => {
    expect(isBannerRow(find('malus-domestica'))).toBe(false)
  })
  it('a genus-leaf (no children) is NOT a banner — it is a plant you grow', () => {
    const leaf = buildForest([{ id: 'dahlia', rank: 'genus', commonName: 'Dahlia' }])
    expect(isBannerRow(leaf[0])).toBe(false)
  })
})

describe('withUnplacedBucket', () => {
  it('leaves the forest unchanged when every root is a family with children', () => {
    const forest = buildForest(nodes.filter((n) => n.id === 'rosaceae' || n.parentId))
    expect(withUnplacedBucket(forest)).toBe(forest)
  })

  it('corrals non-family roots under synthetic Unknown family → Unknown genus banners', () => {
    const src: PlantNode[] = [
      { id: 'rosaceae', rank: 'family', commonName: 'Rosaceae' },
      { id: 'malus', rank: 'genus', parentId: 'rosaceae', commonName: 'Malus' },
      { id: 'malus-domestica', rank: 'species', parentId: 'malus', commonName: 'Apple' },
      { id: 'floating-basil', rank: 'species', commonName: 'Basil' }, // orphan → bucketed
    ]
    const forest = withUnplacedBucket(buildForest(src))
    const all = flattenVisible(forest, new Set(allIds(forest)))
    const find = (id: string) => all.find((t) => t.node.id === id)
    // real family stays a top-level root
    expect(forest[0].node.id).toBe('rosaceae')
    // the bucket is appended last, with the orphan two levels down and re-depthed
    const bucket = forest[forest.length - 1]
    expect(bucket.node.id).toBe(UNKNOWN_FAMILY_ID)
    expect(bucket.children[0].node.id).toBe(UNKNOWN_GENUS_ID)
    expect(find('floating-basil')?.depth).toBe(2)
    // the genuinely-placed plant is NOT bucketed
    expect(find('malus-domestica')?.depth).toBe(2)
  })
})

describe('flatPlants', () => {
  const src: PlantNode[] = [
    { id: 'rosaceae', rank: 'family', commonName: 'Rosaceae' },
    { id: 'malus', rank: 'genus', parentId: 'rosaceae', botanicalName: 'Malus' },
    { id: 'malus-domestica', rank: 'species', parentId: 'malus', commonName: 'Apple' },
    { id: 'apple-falstaff', rank: 'cultivar', parentId: 'malus-domestica', commonName: 'Apple', variety: 'Red Falstaff' },
    { id: 'dahlia', rank: 'genus', commonName: 'Dahlia' }, // genus-leaf → a plant
    { id: 'basil', rank: 'species', commonName: 'Basil' },
  ]

  it('keeps only plant rows (drops family and child-bearing genus)', () => {
    const ids = flatPlants(src).map((n) => n.id)
    expect(ids).not.toContain('rosaceae')
    expect(ids).not.toContain('malus') // structural genus omitted
    expect(ids).toContain('dahlia') // genus-leaf kept
    expect(ids).toContain('malus-domestica')
  })

  it('sorts by display name then variety', () => {
    expect(flatPlants(src).map((n) => n.id)).toEqual(['malus-domestica', 'apple-falstaff', 'basil', 'dahlia'])
  })
})
