import { describe, it, expect } from 'vitest'
import { toDraft, fromDraft, parseColours } from './seasonalEdit'
import type { SeasonalInterest } from '../schema/plant'

describe('parseColours', () => {
  it('splits, trims and drops empties', () => {
    expect(parseColours(' blue , purple ,, white ')).toEqual(['blue', 'purple', 'white'])
  })

  it('de-duplicates case-insensitively, keeping first spelling and order', () => {
    expect(parseColours('Blue, blue, RED')).toEqual(['Blue', 'RED'])
  })

  it('accepts newlines as separators and returns [] for blank text', () => {
    expect(parseColours('blue\npink')).toEqual(['blue', 'pink'])
    expect(parseColours('   ')).toEqual([])
  })
})

describe('toDraft / fromDraft round-trip', () => {
  const grid: SeasonalInterest = {
    spring: { flower: ['pink'], foliage: [] },
    autumn: { fruit: ['orange', 'red'] },
  }

  it('builds a full 4×4 draft, marking present parts on', () => {
    const draft = toDraft(grid)
    expect(draft.spring.flower).toEqual({ on: true, colours: 'pink' })
    // present but uncoloured stays on with an empty string
    expect(draft.spring.foliage).toEqual({ on: true, colours: '' })
    // absent parts are off
    expect(draft.spring.fruit.on).toBe(false)
    expect(draft.autumn.fruit).toEqual({ on: true, colours: 'orange, red' })
    expect(draft.winter.flower.on).toBe(false)
  })

  it('collapses a draft back to a minimal grid preserving on/uncoloured state', () => {
    expect(fromDraft(toDraft(grid))).toEqual(grid)
  })

  it('treats undefined as an all-off draft that collapses to an empty grid', () => {
    const draft = toDraft(undefined)
    expect(draft.summer.flower.on).toBe(false)
    expect(fromDraft(draft)).toEqual({})
  })

  it('drops seasons whose parts are all switched off', () => {
    const draft = toDraft(grid)
    draft.spring.flower.on = false
    draft.spring.foliage.on = false
    const next = fromDraft(draft)
    expect(next.spring).toBeUndefined()
    expect(next.autumn).toEqual({ fruit: ['orange', 'red'] })
  })
})
