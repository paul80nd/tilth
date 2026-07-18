import { describe, it, expect } from 'vitest'
import { footprintOf, plantsInRegion, plantsPerCell, placementCount, DEFAULT_FOOTPRINT } from './spacing'

describe('footprintOf', () => {
  it('prefers an explicit spacing fact', () => {
    expect(footprintOf({ facts: { spacing: '45cm' }, size: { spread: '2m' } })).toBe(0.45)
  })

  it('matches spacing-ish fact keys and ignores others', () => {
    expect(footprintOf({ facts: { 'Row spacing': '0.6m', germination: '14 days' } })).toBe(0.6)
  })

  it('falls back to the ultimate spread when there is no spacing fact', () => {
    expect(footprintOf({ size: { spread: '10-50cm' } })).toBe(0.5)
  })

  it('falls back to the default when nothing is known', () => {
    expect(footprintOf(undefined)).toBe(DEFAULT_FOOTPRINT)
    expect(footprintOf({})).toBe(DEFAULT_FOOTPRINT)
    expect(footprintOf({ facts: { note: 'no number here' } })).toBe(DEFAULT_FOOTPRINT)
  })
})

describe('placementCount', () => {
  const region = { width: 1.2, height: 0.6 }

  it('packs an area placement at its footprint (at least one)', () => {
    expect(placementCount('area', 0.3, region)).toBe(8)
    expect(placementCount(undefined, 0.3, region)).toBe(8) // absent shape ⇒ area
    expect(placementCount('area', 5, region)).toBe(1) // plant bigger than the block still counts one
  })

  it('is always one plant for a single round or rect placement', () => {
    expect(placementCount('round', 0.3, region)).toBe(1)
    expect(placementCount('rect', 0.3, region)).toBe(1)
  })
})

describe('plantsInRegion', () => {
  it('square-packs a region', () => {
    // 1.2m × 0.6m at 0.3m footprint → 4 × 2 = 8
    expect(plantsInRegion(0.3, { width: 1.2, height: 0.6 })).toBe(8)
  })

  it('floors partial rows and columns (conservative)', () => {
    // 1.0m × 1.0m at 0.3m → floor(3.33) × floor(3.33) = 3 × 3 = 9
    expect(plantsInRegion(0.3, { width: 1.0, height: 1.0 })).toBe(9)
  })

  it('fits none when the region is smaller than a footprint', () => {
    expect(plantsInRegion(0.3, { width: 0.2, height: 0.2 })).toBe(0)
  })

  it('guards a zero/negative footprint', () => {
    expect(plantsInRegion(0, { width: 1, height: 1 })).toBe(0)
  })
})

describe('plantsPerCell', () => {
  it('packs small plants many-per-cell', () => {
    // radish 0.05m in a 0.3m cell → floor(6)² = 36
    expect(plantsPerCell(0.05, 0.3)).toBe(36)
  })

  it('gives at least one for a plant as big as (or bigger than) a cell', () => {
    expect(plantsPerCell(0.6, 0.3)).toBe(1)
    expect(plantsPerCell(0.3, 0.3)).toBe(1)
  })

  it('guards zero inputs', () => {
    expect(plantsPerCell(0, 0.3)).toBe(0)
    expect(plantsPerCell(0.3, 0)).toBe(0)
  })
})
