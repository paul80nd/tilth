import { describe, it, expect } from 'vitest'
import { browsableNodes, categoriesOf, filterNodes, generaOf } from './browse'
import type { PlantNode } from '../schema/plant'

const nodes: PlantNode[] = [
  { id: 'solanaceae', rank: 'family', family: 'Solanaceae' },
  { id: 'tomato', rank: 'species', category: 'veg', commonName: 'Tomato', genus: 'Solanum', family: 'Solanaceae' },
  { id: 't-sb', rank: 'cultivar', category: 'veg', commonName: 'Tomato', variety: 'Sunny Bench', genus: 'Solanum' },
  { id: 'basil', rank: 'species', category: 'herb', commonName: 'Basil', genus: 'Ocimum' },
]

describe('browse', () => {
  it('cards only the grow-able ranks (species/cultivar), never family', () => {
    expect(browsableNodes(nodes).map((n) => n.id)).toEqual(['tomato', 't-sb', 'basil'])
  })

  it('filters by category', () => {
    expect(filterNodes(nodes, { category: 'herb' }).map((n) => n.id)).toEqual(['basil'])
  })

  it('filters by genus and by a name search', () => {
    expect(filterNodes(nodes, { genus: 'Ocimum' }).map((n) => n.id)).toEqual(['basil'])
    expect(filterNodes(nodes, { query: 'sunny' }).map((n) => n.id)).toEqual(['t-sb'])
  })

  it('sorts results by display label', () => {
    expect(filterNodes(nodes).map((n) => n.id)).toEqual(['basil', 'tomato', 't-sb'])
  })

  it('derives distinct, sorted facet values from the browsable set only', () => {
    expect(categoriesOf(nodes)).toEqual(['herb', 'veg'])
    expect(generaOf(nodes)).toEqual(['Ocimum', 'Solanum'])
  })
})
