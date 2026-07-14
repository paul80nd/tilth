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

  it('replaces array/object fields wholesale rather than unioning', () => {
    const existing: PlantNode = {
      id: 'x',
      rank: 'species',
      conditions: { soil: ['loam', 'sand'], hardiness: 'H7' },
    }
    const merged = mergeNode(existing, { id: 'x', conditions: { soil: ['chalk'] } }, DB)
    // The whole `conditions` object is replaced — the old hardiness does not survive.
    expect(merged.conditions).toEqual({ soil: ['chalk'] })
  })

  it('does not mutate the inputs', () => {
    const existing: PlantNode = { id: 'x', rank: 'species', commonName: 'Old' }
    const frozen = structuredClone(existing)
    mergeNode(existing, { id: 'x', commonName: 'New' }, DB)
    expect(existing).toEqual(frozen)
  })
})
