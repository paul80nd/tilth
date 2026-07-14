import { describe, it, expect } from 'vitest'
import { displayLabel, matchesQuery, taxonTag } from './naming'
import type { PlantNode } from '../schema/plant'

const tomato: PlantNode = {
  id: 'tomato',
  rank: 'species',
  commonName: 'Tomato',
  botanicalName: 'Solanum lycopersicum',
  genus: 'Solanum',
  family: 'Solanaceae',
}
const cultivar: PlantNode = { ...tomato, id: 't-sb', rank: 'cultivar', variety: 'Sunny Bench' }

describe('naming', () => {
  it('leads with the common name, appending the variety when present', () => {
    expect(displayLabel(tomato)).toBe('Tomato')
    expect(displayLabel(cultivar)).toBe('Tomato · Sunny Bench')
  })

  it('prefers genus over family for the taxon tag', () => {
    expect(taxonTag(tomato)).toBe('Solanum')
    expect(taxonTag({ id: 'x', rank: 'species', family: 'Rosaceae' })).toBe('Rosaceae')
  })

  it('matches a query across common, variety and botanical names, case-insensitively', () => {
    expect(matchesQuery(cultivar, 'sunny')).toBe(true)
    expect(matchesQuery(tomato, 'solanum')).toBe(true)
    expect(matchesQuery(tomato, 'TOMA')).toBe(true)
    expect(matchesQuery(tomato, 'basil')).toBe(false)
    expect(matchesQuery(tomato, '')).toBe(true)
  })
})
