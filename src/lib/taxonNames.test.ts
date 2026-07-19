import { describe, expect, it } from 'vitest'
import { bannerParts, familyCommon, genusCommon, genusGloss, genusPlural, pluralize, type CommonNameOverrides } from './taxonNames'
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

describe('pluralize', () => {
  it('adds -es after a sibilant', () => {
    expect(pluralize('Squash')).toBe('Squashes')
    expect(pluralize('Radish')).toBe('Radishes')
    expect(pluralize('Birch')).toBe('Birches')
  })
  it('turns consonant + y into -ies', () => {
    expect(pluralize('Strawberry')).toBe('Strawberries')
    expect(pluralize('Daisy')).toBe('Daisies')
  })
  it('otherwise adds -s', () => {
    expect(pluralize('Melon')).toBe('Melons')
    expect(pluralize('Rose')).toBe('Roses')
    expect(pluralize('Avocado')).toBe('Avocados')
  })
})

describe('genusGloss', () => {
  it('lists the pluralised common names of the named genera (lowercased, natural list)', () => {
    expect(genusGloss(['Cucumis', 'Cucurbita'])).toBe('melons and squashes')
    expect(genusGloss(['Fragaria', 'Malus', 'Rosa', 'Rubus'])).toBe('strawberries, apples, roses and brambles')
  })
  it('skips genera with no known common name', () => {
    expect(genusGloss(['Fragaria', 'Zzzunknownia'])).toBe('strawberries')
  })
  it('de-duplicates repeated common names', () => {
    expect(genusGloss(['Mentha', 'Mentha'])).toBe('mints')
  })
  it('returns undefined when none of the genera are named', () => {
    expect(genusGloss(['Zzzunknownia', '__unknown-genus__'])).toBeUndefined()
  })
})

describe('common-name overrides', () => {
  const overrides: CommonNameOverrides = {
    families: { Zzzaceae: { common: 'Ziggurat' }, Rosaceae: { common: 'Rose bush' } },
    genera: {
      Fuchsia: { common: 'Fuchsia' },
      Rubus: { common: 'Bramble', plural: 'brambles & berries' },
      Rosa: { common: 'Shrub rose' },
    },
  }

  it('an override wins over the committed default; default is the fallback', () => {
    expect(genusCommon('Rosa', overrides)).toBe('Shrub rose')
    expect(genusCommon('Malus', overrides)).toBe('Apple') // untouched default
    expect(familyCommon('Rosaceae', overrides)).toBe('Rose bush')
  })

  it('gives a name to a taxon that had none', () => {
    expect(genusCommon('Fuchsia')).toBeUndefined()
    expect(genusCommon('Fuchsia', overrides)).toBe('Fuchsia')
    expect(familyCommon('Zzzaceae')).toBeUndefined()
    expect(familyCommon('Zzzaceae', overrides)).toBe('Ziggurat')
  })

  it('genusPlural prefers an explicit override, else derives from the effective common', () => {
    expect(genusPlural('Rubus', overrides)).toBe('brambles & berries') // explicit
    expect(genusPlural('Rosa', overrides)).toBe('Shrub roses') // derived from override common
    expect(genusPlural('Malus', overrides)).toBe('Apples') // derived from default
    expect(genusPlural('Zzz', overrides)).toBeUndefined()
  })

  it('bannerParts uses the override', () => {
    const n: PlantNode = { id: 'rosa', rank: 'genus', botanicalName: 'Rosa', genus: 'Rosa' }
    expect(bannerParts(n).primary).toBe('Rose genus') // committed default
    expect(bannerParts(n, overrides)).toEqual({ primary: 'Shrub rose genus', secondary: 'Rosa' })
  })

  it('genusGloss folds overrides in (added names + explicit plurals)', () => {
    // Onagraceae's Fuchsia gains a name; Rubus uses its explicit plural.
    expect(genusGloss(['Fuchsia', 'Rubus'], overrides)).toBe('fuchsias and brambles & berries')
  })
})
