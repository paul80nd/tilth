import { describe, it, expect } from 'vitest'
import { soilSet, phSet, moistureSet, conditionLabel } from './conditions'

describe('soilSet', () => {
  it('matches the canonical tokens', () => {
    expect(soilSet(['loam', 'clay'])).toEqual(new Set(['loam', 'clay']))
    expect(soilSet(['chalk', 'sand'])).toEqual(new Set(['chalk', 'sand']))
  })

  it('is tolerant of messy strings and casing', () => {
    expect(soilSet(['Loam / Clay', 'Chalky'])).toEqual(new Set(['loam', 'clay', 'chalk']))
  })

  it('is empty for undefined or unknown', () => {
    expect(soilSet(undefined)).toEqual(new Set())
    expect(soilSet(['silt'])).toEqual(new Set())
  })
})

describe('phSet', () => {
  it('matches acid / neutral / alkaline (incl. "alkaline")', () => {
    expect(phSet(['acid', 'neutral'])).toEqual(new Set(['acid', 'neutral']))
    expect(phSet(['Alkaline'])).toEqual(new Set(['alkaline']))
  })
})

describe('moistureSet', () => {
  it('splits "moist but well-drained" into both', () => {
    expect(moistureSet(['moist but well-drained'])).toEqual(new Set(['moist', 'well-drained']))
  })

  it('reads the wet end without also matching well-drained', () => {
    expect(moistureSet(['poorly-drained'])).toEqual(new Set(['poorly-drained']))
    expect(moistureSet(['boggy', 'wet'])).toEqual(new Set(['poorly-drained']))
  })

  it('matches the dry end', () => {
    expect(moistureSet(['well-drained'])).toEqual(new Set(['well-drained']))
    expect(moistureSet(['free-draining'])).toEqual(new Set(['well-drained']))
  })
})

describe('conditionLabel', () => {
  it('prettifies a token', () => {
    expect(conditionLabel('well-drained')).toBe('Well drained')
    expect(conditionLabel('clay')).toBe('Clay')
  })
})
