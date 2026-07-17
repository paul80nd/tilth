import { describe, it, expect } from 'vitest'
import { toPositionDraft, applyPosition } from './positionEdit'
import type { Conditions } from '../schema/plant'

describe('toPositionDraft', () => {
  it('normalises free-text position values to the canonical vocab, in order', () => {
    // Cast: exercise the tolerant matchers on messy import strings the union type wouldn't allow.
    const c = {
      sun: ['Full sun', 'partial shade'],
      aspect: ['South', 'West'],
      exposure: ['Exposed'],
      hardiness: 'H5',
    } as unknown as Conditions
    expect(toPositionDraft(c)).toEqual({
      sun: ['full-sun', 'partial-shade'],
      aspect: ['south', 'west'],
      exposure: ['exposed'],
      hardiness: 'H5',
    })
  })

  it('yields empty facets for absent conditions', () => {
    expect(toPositionDraft(undefined)).toEqual({ sun: [], aspect: [], exposure: [], hardiness: '' })
  })
})

describe('applyPosition', () => {
  it('carries soil/moisture/ph through untouched while writing the position facets', () => {
    const base: Conditions = { soil: ['loam'], moisture: ['moist'], ph: ['neutral'] }
    const out = applyPosition(base, { sun: ['full-sun'], aspect: ['south'], exposure: [], hardiness: 'H6' })
    expect(out).toEqual({
      soil: ['loam'],
      moisture: ['moist'],
      ph: ['neutral'],
      sun: ['full-sun'],
      aspect: ['south'],
      hardiness: 'H6',
    })
  })

  it('omits empty facets (no empty arrays / blank hardiness stored)', () => {
    const out = applyPosition(undefined, { sun: [], aspect: [], exposure: [], hardiness: '  ' })
    expect(out).toEqual({})
  })

  it('round-trips a Position draft unchanged', () => {
    const c: Conditions = { soil: ['clay'], sun: ['full-sun', 'partial-shade'], aspect: ['north'], exposure: ['sheltered'], hardiness: 'H4' }
    expect(applyPosition(c, toPositionDraft(c))).toEqual(c)
  })
})
