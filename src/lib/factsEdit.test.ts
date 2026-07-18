import { describe, it, expect } from 'vitest'
import { toFactsDraft, fromFactsDraft } from './factsEdit'

describe('toFactsDraft', () => {
  it('reads facts into ordered rows', () => {
    expect(toFactsDraft({ spacing: '20cm', germination: '7–14 days' })).toEqual([
      { key: 'spacing', value: '20cm' },
      { key: 'germination', value: '7–14 days' },
    ])
    expect(toFactsDraft(undefined)).toEqual([])
  })
})

describe('fromFactsDraft', () => {
  it('trims, drops blank-key rows, and keeps insertion order', () => {
    expect(
      fromFactsDraft([
        { key: ' spacing ', value: ' 20cm ' },
        { key: '', value: 'orphan' },
        { key: 'depth', value: '1cm' },
      ]),
    ).toEqual({ spacing: '20cm', depth: '1cm' })
  })

  it('lets a later row with the same key win', () => {
    expect(fromFactsDraft([{ key: 'heat', value: 'mild' }, { key: 'heat', value: 'medium' }])).toEqual({ heat: 'medium' })
  })

  it('collapses an all-blank draft to an empty map', () => {
    expect(fromFactsDraft([{ key: '', value: '' }])).toEqual({})
  })
})
