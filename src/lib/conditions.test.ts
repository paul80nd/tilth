import { describe, it, expect } from 'vitest'
import {
  soilSet,
  phSet,
  moistureSet,
  conditionLabel,
  lightSet,
  lightLevel,
  aspectSet,
  exposureSet,
  exposureLevel,
  hardiness,
} from './conditions'

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

describe('lightSet / lightLevel', () => {
  it('reads "partial shade" as partial, not sun or shade', () => {
    expect(lightSet(['Partial shade'])).toEqual(new Set(['partial-shade']))
    expect(lightSet(['Full sun'])).toEqual(new Set(['full-sun']))
    expect(lightSet(['Full shade'])).toEqual(new Set(['full-shade']))
  })

  it('collapses a tolerated range to a glyph state', () => {
    expect(lightLevel(lightSet(['Full sun']))).toBe('full')
    expect(lightLevel(lightSet(['Full sun', 'Partial shade']))).toBe('partial')
    expect(lightLevel(lightSet(['Partial shade']))).toBe('partial')
    expect(lightLevel(lightSet(['Full shade']))).toBe('shade')
    expect(lightLevel(lightSet(undefined))).toBeUndefined()
  })
})

describe('aspectSet', () => {
  it('matches cardinals tolerantly', () => {
    expect(aspectSet(['south', 'west'])).toEqual(new Set(['south', 'west']))
    expect(aspectSet(['South-facing', 'West'])).toEqual(new Set(['south', 'west']))
    expect(aspectSet(undefined)).toEqual(new Set())
  })
})

describe('exposureSet / exposureLevel', () => {
  it('treats tolerating "exposed" (incl. "any") as the windy end', () => {
    expect(exposureLevel(exposureSet(['sheltered']))).toBe('sheltered')
    expect(exposureLevel(exposureSet(['sheltered', 'exposed']))).toBe('exposed')
    expect(exposureLevel(exposureSet(['Exposed']))).toBe('exposed')
    expect(exposureLevel(exposureSet(undefined))).toBeUndefined()
  })
})

describe('hardiness', () => {
  it('reads the leading number and canonicalises the label (lowercase subdivision letter)', () => {
    expect(hardiness('H5')).toEqual({ label: 'H5', rank: 5 })
    expect(hardiness('h1a')).toEqual({ label: 'H1a', rank: 1 })
    expect(hardiness('H1C')).toEqual({ label: 'H1c', rank: 1 }) // stored uppercase → shown lowercase
    expect(hardiness('H7')).toEqual({ label: 'H7', rank: 7 })
  })

  it('is undefined for missing or unparseable ratings', () => {
    expect(hardiness(undefined)).toBeUndefined()
    expect(hardiness('tender')).toBeUndefined()
  })
})
