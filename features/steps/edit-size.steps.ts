import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { updateNode, clearNodeField } from '../../src/app/editNode'
import { getLineage } from '../../src/app/plants'
import { resolveInherited } from '../../src/lib/taxonomy'
import { fromSizeDraft, toSizeDraft } from '../../src/lib/sizeEdit'

const feature = await loadFeature('features/edit-size.feature')

const FIXTURE = {
  nodes: [
    { id: 'malus', rank: 'species', category: 'fruit', commonName: 'Apple', size: { height: '2-4m', spread: '2-4m', timeToSize: '5-10 years' } },
    { id: 'malus-crimson', rank: 'cultivar', parentId: 'malus', commonName: 'Apple', variety: 'Crimson' },
  ],
}

// Drives the exact path the editor takes: start from the resolved (possibly inherited) size, set
// the two fields, and save through the merge seam.
async function editSize(id: string, height: string, spread: string): Promise<void> {
  const { node: found, ancestors } = await getLineage(id)
  const resolved = resolveInherited(found!, ancestors)
  const draft = toSizeDraft(resolved.node.size)
  draft.height = height
  draft.spread = spread
  await updateNode(found!, { size: fromSizeDraft(draft) })
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('an apple species carrying a size and a sparse cultivar', async () => {
      await db.nodes.clear()
      await db.settings.clear()
      await importFragment(FIXTURE, { source: 'plant-db' })
    })
  })

  Scenario("Editing size saves the node's own size as hand-entered", ({ When, Then, And }) => {
    When('I edit node {string} size setting height {string} and spread {string}', async (_, id: string, height: string, spread: string) => {
      await editSize(id, height, spread)
    })
    Then('node {string} height is {string}', async (_, id: string, height: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.size?.height).toBe(height)
    })
    And('node {string} spread is {string}', async (_, id: string, spread: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.size?.spread).toBe(spread)
    })
    And('node {string} size is sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.size?.source).toBe(source)
    })
  })

  Scenario('Editing an inherited size creates an override on the cultivar', ({ When, Then, And }) => {
    When('I edit node {string} size setting height {string} and spread {string}', async (_, id: string, height: string, spread: string) => {
      await editSize(id, height, spread)
    })
    Then('node {string} has its own size', async (_, id: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.size).toBeDefined()
    })
    And('node {string} height is {string}', async (_, id: string, height: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.size?.height).toBe(height)
    })
    And('node {string} size is sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.size?.source).toBe(source)
    })
  })

  Scenario("Clearing a cultivar's size override re-inherits from the species", ({ When, Then, And }) => {
    When('I give node {string} its own size then clear it', async (_, id: string) => {
      const { node: found } = await getLineage(id)
      await updateNode(found!, { size: { height: '9m' } })
      await clearNodeField(id, 'size')
    })
    Then('node {string} has no own size', async (_, id: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.size).toBeUndefined()
    })
    And('node {string} resolves height {string} from the species', async (_, id: string, height: string) => {
      const { node: found, ancestors } = await getLineage(id)
      const resolved = resolveInherited(found!, ancestors)
      expect(resolved.node.size?.height).toBe(height)
    })
  })
})
