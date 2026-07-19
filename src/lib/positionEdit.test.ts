import { describe, it, expect } from 'vitest'
import { toPositionDraft, applyPosition } from './positionEdit'
import type { Position } from '../schema/plant'

describe('toPositionDraft', () => {
  it('normalises free-text position values to the canonical vocab, in order', () => {
    // Cast: exercise the tolerant matchers on messy import strings the union type wouldn't allow.
    const p = {
      sun: ['Full sun', 'partial shade'],
      aspect: ['South', 'West'],
      exposure: ['Exposed'],
      hardiness: 'H5',
    } as unknown as Position
    expect(toPositionDraft(p)).toEqual({
      sun: ['full-sun', 'partial-shade'],
      aspect: ['south', 'west'],
      exposure: ['exposed'],
      hardiness: 'H5',
    })
  })

  it('yields empty facets for absent position', () => {
    expect(toPositionDraft(undefined)).toEqual({ sun: [], aspect: [], exposure: [], hardiness: '' })
  })
})

describe('applyPosition', () => {
  it('writes the position facets, omitting empties', () => {
    const out = applyPosition({ sun: ['full-sun'], aspect: ['south'], exposure: [], hardiness: 'H6' })
    expect(out).toEqual({ sun: ['full-sun'], aspect: ['south'], hardiness: 'H6' })
  })

  it('omits empty facets (no empty arrays / blank hardiness stored)', () => {
    expect(applyPosition({ sun: [], aspect: [], exposure: [], hardiness: '  ' })).toEqual({})
  })

  it('round-trips a Position unchanged', () => {
    const p: Position = { sun: ['full-sun', 'partial-shade'], aspect: ['north'], exposure: ['sheltered'], hardiness: 'H4' }
    expect(applyPosition(toPositionDraft(p))).toEqual(p)
  })
})
