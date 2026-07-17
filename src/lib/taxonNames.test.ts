import { describe, expect, it } from 'vitest'
import { bannerParts } from './taxonNames'
import type { PlantNode } from '../schema/plant'

describe('bannerParts', () => {
  it('leads with the common name and keeps the scientific name as a muted trailer (family)', () => {
    const n: PlantNode = { id: 'liliaceae', rank: 'family', botanicalName: 'Liliaceae', family: 'Liliaceae' }
    expect(bannerParts(n)).toEqual({ primary: 'Lily family', secondary: 'Liliaceae' })
  })

  it('leads with the common name for a genus', () => {
    const n: PlantNode = { id: 'allium', rank: 'genus', botanicalName: 'Allium', genus: 'Allium' }
    expect(bannerParts(n)).toEqual({ primary: 'Onion genus', secondary: 'Allium' })
  })

  it('shows the scientific name alone when no gloss is known', () => {
    const n: PlantNode = { id: 'madeupaceae', rank: 'family', botanicalName: 'Madeupaceae' }
    expect(bannerParts(n)).toEqual({ primary: 'Madeupaceae' })
  })

  it('does not repeat itself when the common name equals the scientific name', () => {
    const n: PlantNode = { id: 'dahlia', rank: 'genus', botanicalName: 'Dahlia', genus: 'Dahlia' }
    expect(bannerParts(n)).toEqual({ primary: 'Dahlia' })
  })

  it('keeps the synthetic Unknown banners readable', () => {
    const n: PlantNode = { id: '__unknown-family__', rank: 'family', commonName: 'Unknown family' }
    expect(bannerParts(n)).toEqual({ primary: 'Unknown family' })
  })
})
