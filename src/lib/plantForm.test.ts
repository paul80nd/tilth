import { describe, it, expect } from 'vitest'
import { EMPTY_FORM, fromNode, toPatch, toCreateFragment, type FormState } from './plantForm'
import type { PlantNode } from '../schema/plant'

const form = (over: Partial<FormState> = {}): FormState => ({ ...EMPTY_FORM, ...over })

describe('fromNode', () => {
  it('hydrates scalars, joins list fields, flattens facts, and copies links', () => {
    const node: PlantNode = {
      id: 'rheum-hybridum',
      rank: 'species',
      category: 'veg',
      commonName: 'Rhubarb',
      variety: 'Timperley Early',
      botanicalName: 'Rheum × hybridum',
      family: 'Polygonaceae',
      genus: 'Rheum',
      otherNames: ['Pie plant', 'Wine plant'],
      synonyms: ['Rheum rhabarbarum'],
      parentId: 'rheum',
      summary: 'Hardy perennial.',
      sourceLinks: [{ source: 'plant-db', url: 'https://x', label: 'RHS' }],
      facts: { spacing: '90cm', depth: '5cm' },
    }
    expect(fromNode(node)).toEqual({
      rank: 'species',
      category: 'veg',
      commonName: 'Rhubarb',
      variety: 'Timperley Early',
      botanicalName: 'Rheum × hybridum',
      family: 'Polygonaceae',
      genus: 'Rheum',
      otherNames: 'Pie plant, Wine plant',
      synonyms: 'Rheum rhabarbarum',
      parentId: 'rheum',
      summary: 'Hardy perennial.',
      sourceLinks: [{ source: 'plant-db', url: 'https://x', label: 'RHS' }],
      facts: [
        { key: 'spacing', value: '90cm' },
        { key: 'depth', value: '5cm' },
      ],
    })
  })

  it('fills blanks/empties for an all-absent node', () => {
    expect(fromNode({ id: 'x', rank: 'genus' })).toEqual({ ...EMPTY_FORM, rank: 'genus' })
  })

  it('copies source links (not shared references)', () => {
    const node: PlantNode = { id: 'x', rank: 'species', sourceLinks: [{ source: 's', url: 'u' }] }
    const hydrated = fromNode(node)
    hydrated.sourceLinks[0].url = 'changed'
    expect(node.sourceLinks![0].url).toBe('u')
  })
})

describe('toPatch', () => {
  it('trims scalars and drops blanks to undefined', () => {
    const p = toPatch(form({ commonName: '  Rhubarb  ', variety: '   ', family: 'Polygonaceae' }))
    expect(p.commonName).toBe('Rhubarb')
    expect(p.variety).toBeUndefined()
    expect(p.family).toBe('Polygonaceae')
  })

  it('parses comma lists, ignoring blanks; empty → undefined', () => {
    expect(toPatch(form({ otherNames: 'Pie plant, , Wine plant ' })).otherNames).toEqual([
      'Pie plant',
      'Wine plant',
    ])
    expect(toPatch(form({ otherNames: ' , ' })).otherNames).toBeUndefined()
  })

  it('keeps only source links with both a source and url, dropping an empty label key', () => {
    const p = toPatch(
      form({
        sourceLinks: [
          { source: ' plant-db ', url: ' https://x ', label: '  ' },
          { source: 'seed', url: '' }, // dropped: no url
          { source: '', url: 'https://y' }, // dropped: no source
          { source: 'rhs', url: 'https://z', label: 'RHS' },
        ],
      }),
    )
    expect(p.sourceLinks).toEqual([
      { source: 'plant-db', url: 'https://x' },
      { source: 'rhs', url: 'https://z', label: 'RHS' },
    ])
  })

  it('collapses fact rows to a map, trimming keys and dropping keyless rows', () => {
    const p = toPatch(
      form({
        facts: [
          { key: ' spacing ', value: ' 90cm ' },
          { key: '', value: 'orphan' },
        ],
      }),
    )
    expect(p.facts).toEqual({ spacing: '90cm' })
  })

  it('leaves emptied arrays/maps undefined when adding, but clears them when editing had a value', () => {
    const add = toPatch(form({ sourceLinks: [], facts: [] }))
    expect(add.sourceLinks).toBeUndefined()
    expect(add.facts).toBeUndefined()

    const existing: PlantNode = {
      id: 'x',
      rank: 'species',
      sourceLinks: [{ source: 's', url: 'u' }],
      facts: { spacing: '1m' },
    }
    const edit = toPatch(form({ sourceLinks: [], facts: [] }), existing)
    expect(edit.sourceLinks).toEqual([]) // explicit clear
    expect(edit.facts).toEqual({}) // explicit clear
  })

  it('round-trips a node through fromNode → toPatch', () => {
    const node: PlantNode = {
      id: 'x',
      rank: 'cultivar',
      commonName: 'Apple',
      otherNames: ['a', 'b'],
      facts: { spacing: '4m' },
      sourceLinks: [{ source: 's', url: 'u' }],
    }
    const p = toPatch(fromNode(node), node)
    expect(p.commonName).toBe('Apple')
    expect(p.otherNames).toEqual(['a', 'b'])
    expect(p.facts).toEqual({ spacing: '4m' })
    expect(p.sourceLinks).toEqual([{ source: 's', url: 'u' }])
  })
})

describe('toCreateFragment', () => {
  it('suggests an id from the identity and includes only the set fields', () => {
    const frag = toCreateFragment(form({ botanicalName: 'Rheum × hybridum', variety: 'Timperley Early' }))
    expect(frag.id).toBe('rheum-hybridum-timperley-early')
    expect(frag.botanicalName).toBe('Rheum × hybridum')
    expect(frag.variety).toBe('Timperley Early')
    // Unset optional fields are absent (so the merge leaves them alone), not present-as-undefined.
    expect('commonName' in frag).toBe(false)
    expect('summary' in frag).toBe(false)
  })

  it('falls back to the "plant" id when the form has no identity', () => {
    expect(toCreateFragment(form()).id).toBe('plant')
  })
})
