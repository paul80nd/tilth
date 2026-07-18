import { describe, it, expect } from 'vitest'
import { toEdibilityDraft, fromEdibilityDraft } from './edibilityEdit'

describe('toEdibilityDraft', () => {
  it('joins edible parts and passes toxicity through, blanks for absent', () => {
    expect(toEdibilityDraft(['fruit', 'leaves'], 'Harmful if eaten')).toEqual({
      edible: 'fruit, leaves',
      toxicity: 'Harmful if eaten',
    })
    expect(toEdibilityDraft(undefined, undefined)).toEqual({ edible: '', toxicity: '' })
  })
})

describe('fromEdibilityDraft', () => {
  it('splits parts on commas, trims, drops blanks, trims toxicity', () => {
    expect(fromEdibilityDraft({ edible: ' fruit , , leaves ', toxicity: '  Irritant  ' })).toEqual({
      edible: ['fruit', 'leaves'],
      toxicity: 'Irritant',
    })
  })

  it('yields an empty array / string when a field is emptied (an override to blank)', () => {
    expect(fromEdibilityDraft({ edible: '', toxicity: '' })).toEqual({ edible: [], toxicity: '' })
  })

  it('round-trips through the draft', () => {
    expect(fromEdibilityDraft(toEdibilityDraft(['seeds'], 'Toxic to pets'))).toEqual({
      edible: ['seeds'],
      toxicity: 'Toxic to pets',
    })
  })
})
