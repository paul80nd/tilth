import { describe, it, expect } from 'vitest'
import { toConditionsDraft, applyConditions } from './conditionsEdit'
import type { Conditions } from '../schema/plant'

describe('toConditionsDraft', () => {
  it('normalises free-text soil/moisture/pH to the canonical vocab, in order', () => {
    // Cast: exercise the tolerant matchers on messy import strings the union type wouldn't allow.
    const c = {
      soil: ['Loam / Clay', 'Chalky'],
      moisture: ['Moist but well-drained'],
      ph: ['Acid', 'Alkaline'],
    } as unknown as Conditions
    expect(toConditionsDraft(c)).toEqual({
      soil: ['chalk', 'clay', 'loam'],
      moisture: ['well-drained', 'moist'],
      ph: ['acid', 'alkaline'],
    })
  })

  it('yields empty facets for absent conditions', () => {
    expect(toConditionsDraft(undefined)).toEqual({ soil: [], moisture: [], ph: [] })
  })
})

describe('applyConditions', () => {
  it('carries the position facets through untouched while writing soil/moisture/pH', () => {
    const base: Conditions = { sun: ['full-sun'], aspect: ['south'], hardiness: 'H6' }
    const out = applyConditions(base, { soil: ['loam'], moisture: ['moist'], ph: ['neutral'] })
    expect(out).toEqual({
      sun: ['full-sun'],
      aspect: ['south'],
      hardiness: 'H6',
      soil: ['loam'],
      moisture: ['moist'],
      ph: ['neutral'],
    })
  })

  it('omits empty facets (no empty arrays stored)', () => {
    expect(applyConditions(undefined, { soil: [], moisture: [], ph: [] })).toEqual({})
  })

  it('round-trips a Conditions draft unchanged', () => {
    const c: Conditions = { hardiness: 'H4', soil: ['clay', 'sand'], moisture: ['well-drained'], ph: ['acid'] }
    expect(applyConditions(c, toConditionsDraft(c))).toEqual(c)
  })
})
