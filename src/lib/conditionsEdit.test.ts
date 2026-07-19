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
  it('writes soil/moisture/pH, omitting empties', () => {
    const out = applyConditions({ soil: ['loam'], moisture: [], ph: ['neutral'] })
    expect(out).toEqual({ soil: ['loam'], ph: ['neutral'] })
  })

  it('omits empty facets (no empty arrays stored)', () => {
    expect(applyConditions({ soil: [], moisture: [], ph: [] })).toEqual({})
  })

  it('round-trips a Conditions unchanged', () => {
    const c: Conditions = { soil: ['clay', 'sand'], moisture: ['well-drained'], ph: ['acid'] }
    expect(applyConditions(toConditionsDraft(c))).toEqual(c)
  })
})
