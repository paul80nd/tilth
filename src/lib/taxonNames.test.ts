import { describe, expect, it } from 'vitest'
import { bannerLabel } from './taxonNames'
import type { PlantNode } from '../schema/plant'

describe('bannerLabel', () => {
  it('glosses a family with its common name in parentheses', () => {
    const n: PlantNode = { id: 'liliaceae', rank: 'family', botanicalName: 'Liliaceae', family: 'Liliaceae' }
    expect(bannerLabel(n)).toBe('Liliaceae (Lily family)')
  })

  it('glosses a genus with its common name in parentheses', () => {
    const n: PlantNode = { id: 'allium', rank: 'genus', botanicalName: 'Allium', genus: 'Allium' }
    expect(bannerLabel(n)).toBe('Allium (Onion genus)')
  })

  it('shows the scientific name alone when no gloss is known', () => {
    const n: PlantNode = { id: 'madeupaceae', rank: 'family', botanicalName: 'Madeupaceae' }
    expect(bannerLabel(n)).toBe('Madeupaceae')
  })

  it('does not repeat itself when the common name equals the scientific name', () => {
    const n: PlantNode = { id: 'dahlia', rank: 'genus', botanicalName: 'Dahlia', genus: 'Dahlia' }
    expect(bannerLabel(n)).toBe('Dahlia')
  })

  it('keeps the synthetic Unknown banners readable', () => {
    const n: PlantNode = { id: '__unknown-family__', rank: 'family', commonName: 'Unknown family' }
    expect(bannerLabel(n)).toBe('Unknown family')
  })
})
