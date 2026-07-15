import { describe, it, expect } from 'vitest'
import { deepEqual, nodeDiff, isEmptyDiff, slugify, suggestId } from './editNode'
import type { PlantNode } from '../schema/plant'

const base: PlantNode = {
  id: 'rhubarb',
  rank: 'cultivar',
  commonName: 'Rhubarb',
  botanicalName: 'Rheum x hybridum',
  otherNames: ['Pie plant'],
  sourceLinks: [{ source: 'plant-db', url: 'https://example.invalid/rhubarb' }],
}

describe('deepEqual', () => {
  it('compares scalars, arrays and objects, ignoring object key order', () => {
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(deepEqual(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(deepEqual({ x: 1, y: 2 }, { y: 2, x: 1 })).toBe(true)
    expect(deepEqual({ x: 1 }, { x: 2 })).toBe(false)
    expect(deepEqual([{ source: 'plant-db', url: 'u' }], [{ url: 'u', source: 'plant-db' }])).toBe(true)
  })
})

describe('nodeDiff', () => {
  it('carries only changed fields, always keyed by id', () => {
    const frag = nodeDiff(base, { commonName: 'Rhubarb', variety: 'Raspberry Red' })
    expect(frag).toEqual({ id: 'rhubarb', variety: 'Raspberry Red' })
  })

  it('leaves an unchanged field out (so its provenance is preserved by the merge)', () => {
    const frag = nodeDiff(base, { commonName: 'Rhubarb', botanicalName: 'Rheum x hybridum' })
    expect(isEmptyDiff(frag)).toBe(true)
  })

  it('detects a changed array by value, not identity', () => {
    const frag = nodeDiff(base, { otherNames: ['Pie plant', 'Wine plant'] })
    expect(frag.otherNames).toEqual(['Pie plant', 'Wine plant'])
  })

  it('treats an emptied array as a change (clearing links)', () => {
    const frag = nodeDiff(base, { sourceLinks: [] })
    expect(frag.sourceLinks).toEqual([])
    expect(isEmptyDiff(frag)).toBe(false)
  })

  it('ignores undefined patch fields (not edited) and never diffs provenance', () => {
    const frag = nodeDiff(base, { variety: undefined, provenance: {} as PlantNode['provenance'] })
    expect(isEmptyDiff(frag)).toBe(true)
  })
})

describe('suggestId / slugify', () => {
  it('slugifies punctuation and spaces', () => {
    expect(slugify("Gardener's Delight")).toBe('gardeners-delight')
    expect(slugify('Rheum x hybridum')).toBe('rheum-x-hybridum')
  })

  it('prefers botanical name, appends the variety', () => {
    expect(suggestId({ botanicalName: 'Rheum x hybridum', variety: 'Raspberry Red' })).toBe(
      'rheum-x-hybridum-raspberry-red',
    )
  })

  it('falls back to common name, then to "plant"', () => {
    expect(suggestId({ commonName: 'Rhubarb' })).toBe('rhubarb')
    expect(suggestId({})).toBe('plant')
  })
})
