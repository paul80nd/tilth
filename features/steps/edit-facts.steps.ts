import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { updateNode, clearNodeField } from '../../src/app/editNode'
import { getLineage } from '../../src/app/plants'
import { resolveInherited } from '../../src/lib/taxonomy'
import { fromFactsDraft } from '../../src/lib/factsEdit'

const feature = await loadFeature('features/edit-facts.feature')

const FIXTURE = {
  nodes: [
    { id: 'solanum', rank: 'species', category: 'fruit', commonName: 'Tomato', facts: { spacing: '45cm', germination: '10 days' } },
    { id: 'solanum-gardeners', rank: 'cultivar', parentId: 'solanum', commonName: 'Tomato', variety: "Gardener's" },
  ],
}

type Row = { key: string; value: string }

// Drives the editor's save path: the ticked rows become the whole (own) facts object.
async function setFacts(id: string, rows: Row[]): Promise<void> {
  const { node: found } = await getLineage(id)
  await updateNode(found!, { facts: fromFactsDraft(rows) })
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a tomato species carrying facts and a sparse cultivar', async () => {
      await db.nodes.clear()
      await db.settings.clear()
      await importFragment(FIXTURE, { source: 'plant-db' })
    })
  })

  Scenario("Setting facts saves the node's own facts as hand-entered", ({ When, Then, And }) => {
    When('I set node {string} facts to:', async (_, id: string, rows: Row[]) => {
      await setFacts(id, rows)
    })
    Then('node {string} fact {string} is {string}', async (_, id: string, key: string, value: string) => {
      expect((await db.nodes.get(id))?.facts?.[key]).toBe(value)
    })
    And('node {string} fact {string} is {string}', async (_, id: string, key: string, value: string) => {
      expect((await db.nodes.get(id))?.facts?.[key]).toBe(value)
    })
    And('node {string} facts is sourced from {string}', async (_, id: string, source: string) => {
      expect((await db.nodes.get(id))?.provenance?.facts?.source).toBe(source)
    })
  })

  Scenario('Removing a fact drops just that key', ({ When, Then, And }) => {
    When('I set node {string} facts to:', async (_, id: string, rows: Row[]) => {
      await setFacts(id, rows)
    })
    Then('node {string} fact {string} is {string}', async (_, id: string, key: string, value: string) => {
      expect((await db.nodes.get(id))?.facts?.[key]).toBe(value)
    })
    And('node {string} has no fact {string}', async (_, id: string, key: string) => {
      expect((await db.nodes.get(id))?.facts?.[key]).toBeUndefined()
    })
  })

  Scenario('Clearing the facts override re-inherits from the species', ({ When, Then, And }) => {
    When('I give node {string} its own facts then clear it', async (_, id: string) => {
      const { node: found } = await getLineage(id)
      await updateNode(found!, { facts: { note: 'temporary' } })
      await clearNodeField(id, 'facts')
    })
    Then('node {string} has no own facts', async (_, id: string) => {
      expect((await db.nodes.get(id))?.facts).toBeUndefined()
    })
    And('node {string} resolves fact {string} as {string} from the species', async (_, id: string, key: string, value: string) => {
      const { node: found, ancestors } = await getLineage(id)
      const resolved = resolveInherited(found!, ancestors)
      expect(resolved.node.facts?.[key]).toBe(value)
    })
  })
})
