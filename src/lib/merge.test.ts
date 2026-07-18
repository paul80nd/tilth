import { describe, expect, it } from 'vitest'
import { mergeNode } from './merge'
import type { PlantNode } from '../schema/plant'

const DB = { source: 'plant-db', url: 'https://example/plant-db', importedAt: '2026-07-14' }
const PACKET = { source: 'seed-packet', importedAt: '2026-07-15' }

describe('mergeNode', () => {
  it('promotes a fragment to a full node when nothing exists yet', () => {
    const node = mergeNode(undefined, { id: 'centaurea-cyanus', rank: 'species', commonName: 'Cornflower' }, DB)
    expect(node.id).toBe('centaurea-cyanus')
    expect(node.rank).toBe('species')
    expect(node.commonName).toBe('Cornflower')
    expect(node.provenance?.commonName?.source).toBe('plant-db')
  })

  it('overwrites present fields and leaves absent ones untouched', () => {
    const existing: PlantNode = {
      id: 'x',
      rank: 'species',
      commonName: 'Cornflower',
      family: 'Asteraceae',
      provenance: { commonName: { source: 'plant-db' }, family: { source: 'plant-db' } },
    }
    // A seed-packet fragment supplies only the sowing half.
    const merged = mergeNode(existing, { id: 'x', facts: { 'sowing depth': '0.5cm' } }, PACKET)

    expect(merged.family).toBe('Asteraceae') // untouched
    expect(merged.commonName).toBe('Cornflower') // untouched
    expect(merged.facts).toEqual({ 'sowing depth': '0.5cm' }) // added
    // Provenance: untouched fields keep the database source, the new field is stamped seed-packet.
    expect(merged.provenance?.family?.source).toBe('plant-db')
    expect(merged.provenance?.facts?.source).toBe('seed-packet')
  })

  it('replaces array fields wholesale rather than unioning (a source supplies its full set)', () => {
    const existing: PlantNode = {
      id: 'x',
      rank: 'species',
      conditions: { soil: ['loam', 'sand'], hardiness: 'H7' },
    }
    const merged = mergeNode(existing, { id: 'x', conditions: { soil: ['chalk'] } }, DB)
    // The `soil` array is replaced (not unioned)…
    expect(merged.conditions?.soil).toEqual(['chalk'])
    // …but the sibling `hardiness` another source set survives — the object deep-merges.
    expect(merged.conditions?.hardiness).toBe('H7')
  })

  it('deep-merges nested objects so two sources fill different facets', () => {
    const existing: PlantNode = { id: 'x', rank: 'species', facts: { harvest: 'July' } }
    // A seed packet adds a sowing chip; the earlier harvest chip must not be clobbered.
    const merged = mergeNode(existing, { id: 'x', facts: { 'sowing depth': '0.5cm' } }, PACKET)
    expect(merged.facts).toEqual({ harvest: 'July', 'sowing depth': '0.5cm' })
    // Provenance stays field-level: the whole `facts` field is stamped with the latest source.
    expect(merged.provenance?.facts?.source).toBe('seed-packet')
  })

  it('recurses into deeply nested objects (season × part), replacing only leaf arrays', () => {
    const existing: PlantNode = {
      id: 'x',
      rank: 'species',
      seasonalInterest: { spring: { foliage: ['green'] } },
    }
    const merged = mergeNode(
      existing,
      { id: 'x', seasonalInterest: { summer: { fruit: ['red'] }, spring: { flower: ['blue'] } } },
      DB,
    )
    expect(merged.seasonalInterest).toEqual({
      spring: { foliage: ['green'], flower: ['blue'] },
      summer: { fruit: ['red'] },
    })
  })

  it('replaces the whole object under objects:"replace" (the hand-edit path)', () => {
    const existing: PlantNode = {
      id: 'x',
      rank: 'species',
      conditions: { soil: ['loam'], hardiness: 'H7' },
    }
    // The editor submits the whole object; dropping `hardiness` must remove it.
    const merged = mergeNode(existing, { id: 'x', conditions: { soil: ['chalk'] } }, { ...DB, objects: 'replace' })
    expect(merged.conditions).toEqual({ soil: ['chalk'] })
  })

  it('assigns structural fields (rank/parentId) but never stamps provenance on them', () => {
    const node = mergeNode(
      undefined,
      { id: 'delphinium-magic-fountains', rank: 'cultivar', parentId: 'delphinium-elatum', variety: 'Magic Fountains' },
      DB,
    )
    // Placement is applied…
    expect(node.rank).toBe('cultivar')
    expect(node.parentId).toBe('delphinium-elatum')
    // …but it's structural, so it carries no provenance — only the data field does.
    expect(node.provenance?.rank).toBeUndefined()
    expect(node.provenance?.parentId).toBeUndefined()
    expect(node.provenance?.variety?.source).toBe('plant-db')
  })

  it('re-parents an existing node without stamping provenance', () => {
    const existing: PlantNode = { id: 'x', rank: 'cultivar', parentId: 'old-species' }
    const merged = mergeNode(existing, { id: 'x', parentId: 'new-species' }, DB)
    expect(merged.parentId).toBe('new-species')
    expect(merged.provenance?.parentId).toBeUndefined()
  })

  it('self-heals stale structural provenance left by an earlier version', () => {
    const existing: PlantNode = {
      id: 'x',
      rank: 'species',
      commonName: 'Rose',
      // A pre-fix import wrongly stamped structural fields.
      provenance: { rank: { source: 'plant-db' }, parentId: { source: 'plant-db' }, commonName: { source: 'plant-db' } },
    }
    const merged = mergeNode(existing, { id: 'x', family: 'Rosaceae' }, DB)
    expect(merged.provenance?.rank).toBeUndefined()
    expect(merged.provenance?.parentId).toBeUndefined()
    // Real data provenance is untouched.
    expect(merged.provenance?.commonName?.source).toBe('plant-db')
    expect(merged.provenance?.family?.source).toBe('plant-db')
  })

  it('does not mutate the inputs', () => {
    const existing: PlantNode = { id: 'x', rank: 'species', commonName: 'Old' }
    const frozen = structuredClone(existing)
    mergeNode(existing, { id: 'x', commonName: 'New' }, DB)
    expect(existing).toEqual(frozen)
  })
})
