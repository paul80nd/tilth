import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { getNeighbourhood } from '../../src/app/plants'
import type { Neighbourhood } from '../../src/lib/neighbourhood'
import { makeNode } from '../../test/factories'

const feature = await loadFeature('features/neighbourhood.feature')

let result: Neighbourhood | undefined

const FIXTURE = [
  makeNode({ id: 'rosaceae', rank: 'family', botanicalName: 'Rosaceae' }),
  makeNode({ id: 'malus', rank: 'genus', parentId: 'rosaceae', botanicalName: 'Malus' }),
  makeNode({ id: 'apple', rank: 'species', parentId: 'malus', commonName: 'Apple' }),
  makeNode({ id: 'apple-red', rank: 'cultivar', parentId: 'apple', commonName: 'Apple', variety: 'Redglow' }),
  makeNode({ id: 'apple-sweet', rank: 'cultivar', parentId: 'apple', commonName: 'Apple', variety: 'Sweetcrop' }),
  makeNode({ id: 'crab', rank: 'species', parentId: 'malus', commonName: 'Crab apple' }),
  makeNode({ id: 'crab-john', rank: 'cultivar', parentId: 'crab', commonName: 'Crab apple', variety: 'John Downie' }),
]

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given, And }) => {
    Given('the store starts empty', async () => {
      await db.nodes.clear()
    })
    And('the Malus genus with two apple species and their cultivars', async () => {
      await db.nodes.bulkPut(FIXTURE)
    })
  })

  Scenario("A cultivar's neighbourhood is its whole genus subtree", ({ When, Then, And }) => {
    When('I look at the neighbourhood of {string}', async (_, id: string) => {
      result = await getNeighbourhood(id)
    })
    Then('the neighbourhood family is {string}', (_, id: string) => {
      expect(result?.family?.id).toBe(id)
    })
    And('the neighbourhood genus is {string}', (_, id: string) => {
      expect(result?.genus.id).toBe(id)
    })
    And('the neighbourhood species are {string}', (_, csv: string) => {
      expect(result?.entries.map((e) => e.node.id)).toEqual(csv.split(','))
    })
    And('the neighbourhood species {string} has cultivars {string}', (_, speciesId: string, csv: string) => {
      const entry = result?.entries.find((e) => e.node.id === speciesId)
      expect(entry?.children.map((c) => c.id)).toEqual(csv.split(','))
    })
  })

  Scenario('A family has no genus neighbourhood', ({ When, Then }) => {
    When('I look at the neighbourhood of {string}', async (_, id: string) => {
      result = await getNeighbourhood(id)
    })
    Then('there is no neighbourhood', () => {
      expect(result).toBeUndefined()
    })
  })
})
