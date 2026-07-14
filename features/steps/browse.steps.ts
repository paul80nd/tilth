import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { listNodes } from '../../src/app/plants'
import { filterNodes, type BrowseCriteria } from '../../src/lib/browse'
import type { Category } from '../../src/schema/plant'

const feature = await loadFeature('features/browse.feature')

// A record spanning a non-browsable family node plus browsable species/cultivars.
const FIXTURE = {
  nodes: [
    { id: 'solanaceae', rank: 'family', family: 'Solanaceae' },
    { id: 'tomato', rank: 'species', category: 'veg', commonName: 'Tomato', botanicalName: 'Solanum lycopersicum', genus: 'Solanum', family: 'Solanaceae' },
    { id: 't-sb', rank: 'cultivar', parentId: 'tomato', category: 'veg', commonName: 'Tomato', variety: 'Sunny Bench', botanicalName: 'Solanum lycopersicum', genus: 'Solanum' },
    { id: 'basil', rank: 'species', category: 'herb', commonName: 'Basil', genus: 'Ocimum' },
  ],
}

function ids(list: string): string[] {
  return list.split(',').map((s) => s.trim()).filter(Boolean)
}

async function browse(criteria: BrowseCriteria): Promise<string[]> {
  return filterNodes(await listNodes(), criteria).map((n) => n.id)
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the record holds a family, two tomatoes and a basil', async () => {
      await db.nodes.clear()
      await db.settings.clear()
      await importFragment(FIXTURE, { source: 'plant-db' })
      expect(await db.nodes.count()).toBe(4)
    })
  })

  Scenario('Browse cards only the plants you look up, not higher taxonomy', ({ When, Then }) => {
    let result: string[] = []
    When('I browse with no filters', async () => {
      result = await browse({})
    })
    Then('I see plants {string}', (_, list: string) => {
      expect(result).toEqual(ids(list))
    })
  })

  Scenario('Filter by category', ({ When, Then }) => {
    let result: string[] = []
    When('I browse the category {string}', async (_, category: string) => {
      result = await browse({ category: category as Category })
    })
    Then('I see plants {string}', (_, list: string) => {
      expect(result).toEqual(ids(list))
    })
  })

  Scenario('Search by variety name', ({ When, Then }) => {
    let result: string[] = []
    When('I search browse for {string}', async (_, query: string) => {
      result = await browse({ query })
    })
    Then('I see plants {string}', (_, list: string) => {
      expect(result).toEqual(ids(list))
    })
  })

  Scenario('Search by botanical name', ({ When, Then }) => {
    let result: string[] = []
    When('I search browse for {string}', async (_, query: string) => {
      result = await browse({ query })
    })
    Then('I see plants {string}', (_, list: string) => {
      expect(result).toEqual(ids(list))
    })
  })
})
