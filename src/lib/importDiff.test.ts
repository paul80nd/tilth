import { describe, expect, it } from 'vitest'
import { diffNode, hasChanges, selectFragment } from './importDiff'
import type { PlantNode } from '../schema/plant'

const existing: PlantNode = {
  id: 'delphinium-magic-fountains',
  rank: 'cultivar',
  commonName: 'Delphinium',
  conditions: { soil: ['loam'], hardiness: 'H5' },
}

describe('diffNode', () => {
  it('classifies fields as new / changed / same against the existing node', () => {
    const { isNew, changes } = diffNode(existing, {
      id: 'delphinium-magic-fountains',
      commonName: 'Delphinium', // same
      botanicalName: 'Delphinium Magic Fountains Series', // new
      conditions: { soil: ['chalk', 'loam', 'sand'], hardiness: 'H5' }, // changed (whole field)
    })
    expect(isNew).toBe(false)
    expect(changes).toContainEqual({ field: 'commonName', status: 'same', existing: 'Delphinium', incoming: 'Delphinium' })
    expect(changes).toContainEqual({ field: 'botanicalName', status: 'new', existing: undefined, incoming: 'Delphinium Magic Fountains Series' })
    const cond = changes.find((c) => c.field === 'conditions')!
    expect(cond.status).toBe('changed')
  })

  it('marks every field new when the node does not exist yet', () => {
    const diff = diffNode(undefined, { id: 'x', rank: 'species', commonName: 'New' })
    expect(diff.isNew).toBe(true)
    expect(diff.changes.every((c) => c.status === 'new')).toBe(true)
  })

  it('ignores id and provenance', () => {
    const diff = diffNode(existing, { id: 'delphinium-magic-fountains', provenance: { commonName: { source: 'x' } } } as never)
    expect(diff.changes).toEqual([])
  })

  it('hasChanges is false when everything is same', () => {
    const diff = diffNode(existing, { id: 'delphinium-magic-fountains', commonName: 'Delphinium' })
    expect(hasChanges(diff)).toBe(false)
  })
})

describe('selectFragment', () => {
  it('keeps id plus only the named fields', () => {
    const frag = { id: 'x', commonName: 'A', botanicalName: 'B', family: 'C' }
    expect(selectFragment(frag, ['botanicalName', 'family'])).toEqual({ id: 'x', botanicalName: 'B', family: 'C' })
  })

  it('drops everything but id when nothing is ticked', () => {
    expect(selectFragment({ id: 'x', commonName: 'A' }, [])).toEqual({ id: 'x' })
  })
})
