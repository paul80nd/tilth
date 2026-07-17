import { describe, it, expect } from 'vitest'
import { nodeTags } from './tags'
import type { PlantNode } from '../schema/plant'

const base = (over: Partial<PlantNode>): PlantNode => ({ id: 'n', rank: 'species', ...over })

describe('nodeTags', () => {
  it('emits category · rank · lifecycle · foliage · habit in order', () => {
    const tags = nodeTags(
      base({ category: 'veg', rank: 'cultivar', lifecycle: ['annual'], foliage: 'deciduous', habit: 'bushy' }),
    )
    expect(tags.map((t) => t.kind)).toEqual(['category', 'rank', 'lifecycle', 'foliage', 'habit'])
    expect(tags.map((t) => t.label)).toEqual(['veg', 'cultivar', 'Annual', 'deciduous', 'bushy'])
  })

  it('tones the category chip brand and leaves the rest neutral', () => {
    const tags = nodeTags(base({ category: 'herb' }))
    expect(tags[0]).toMatchObject({ kind: 'category', tone: 'brand' })
    expect(tags[1].tone).toBeUndefined()
  })

  it('always includes the rank, even with nothing else set', () => {
    expect(nodeTags(base({ rank: 'genus' }))).toEqual([{ label: 'genus', kind: 'rank' }])
  })

  it('emits one chip per lifecycle value and coerces a legacy string', () => {
    expect(nodeTags(base({ lifecycle: ['annual', 'perennial'] })).filter((t) => t.kind === 'lifecycle').map((t) => t.label)).toEqual([
      'Annual',
      'Perennial',
    ])
    // A legacy single-string lifecycle (pre-array store) still yields one chip.
    expect(nodeTags(base({ lifecycle: 'biennial' as unknown as PlantNode['lifecycle'] })).filter((t) => t.kind === 'lifecycle').map((t) => t.label)).toEqual([
      'Biennial',
    ])
  })

  it('omits absent optional fields', () => {
    expect(nodeTags(base({})).map((t) => t.kind)).toEqual(['rank'])
  })
})
