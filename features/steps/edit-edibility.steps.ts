import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { updateNode, clearNodeFields } from '../../src/app/editNode'
import { getLineage } from '../../src/app/plants'
import { resolveInherited } from '../../src/lib/taxonomy'
import { fromEdibilityDraft, toEdibilityDraft } from '../../src/lib/edibilityEdit'

const feature = await loadFeature('features/edit-edibility.feature')

const FIXTURE = {
  nodes: [
    { id: 'rheum', rank: 'species', category: 'veg', commonName: 'Rhubarb', edible: ['stems'], toxicity: 'Leaves are toxic' },
    { id: 'rheum-victoria', rank: 'cultivar', parentId: 'rheum', commonName: 'Rhubarb', variety: 'Victoria' },
  ],
}

// Drives the exact path the editor takes: start from the resolved (possibly inherited) values,
// set the two fields, and save through the merge seam.
async function editEdibility(id: string, edible: string, caution: string): Promise<void> {
  const { node: found, ancestors } = await getLineage(id)
  const resolved = resolveInherited(found!, ancestors)
  const draft = toEdibilityDraft(resolved.node.edible, resolved.node.toxicity)
  draft.edible = edible
  draft.toxicity = caution
  const patch = fromEdibilityDraft(draft)
  await updateNode(found!, { edible: patch.edible, toxicity: patch.toxicity })
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a rhubarb species carrying edibility and a sparse cultivar', async () => {
      await db.nodes.clear()
      await db.settings.clear()
      await importFragment(FIXTURE, { source: 'plant-db' })
    })
  })

  Scenario("Editing edibility saves the node's own parts and caution as hand-entered", ({ When, Then, And }) => {
    When('I edit node {string} edibility setting edible {string} and caution {string}', async (_, id: string, edible: string, caution: string) => {
      await editEdibility(id, edible, caution)
    })
    Then('node {string} edible is {string}', async (_, id: string, expected: string) => {
      expect((await db.nodes.get(id))?.edible?.join(', ')).toBe(expected)
    })
    And('node {string} caution is {string}', async (_, id: string, expected: string) => {
      expect((await db.nodes.get(id))?.toxicity).toBe(expected)
    })
    And('node {string} edible is sourced from {string}', async (_, id: string, source: string) => {
      expect((await db.nodes.get(id))?.provenance?.edible?.source).toBe(source)
    })
  })

  Scenario('Editing inherited edibility creates an override on the cultivar', ({ When, Then, And }) => {
    When('I edit node {string} edibility setting edible {string} and caution {string}', async (_, id: string, edible: string, caution: string) => {
      await editEdibility(id, edible, caution)
    })
    Then('node {string} has its own edible', async (_, id: string) => {
      expect((await db.nodes.get(id))?.edible).toBeDefined()
    })
    And('node {string} edible is {string}', async (_, id: string, expected: string) => {
      expect((await db.nodes.get(id))?.edible?.join(', ')).toBe(expected)
    })
  })

  Scenario('Clearing an edibility override re-inherits both fields from the species', ({ When, Then, And }) => {
    When('I give node {string} its own edibility then clear it', async (_, id: string) => {
      const { node: found } = await getLineage(id)
      await updateNode(found!, { edible: ['stalks'], toxicity: 'Leaves are toxic' })
      await clearNodeFields(id, ['edible', 'toxicity'])
    })
    Then('node {string} has no own edible', async (_, id: string) => {
      expect((await db.nodes.get(id))?.edible).toBeUndefined()
    })
    And('node {string} has no own toxicity', async (_, id: string) => {
      expect((await db.nodes.get(id))?.toxicity).toBeUndefined()
    })
    And('node {string} resolves edible {string} from the species', async (_, id: string, expected: string) => {
      const { node: found, ancestors } = await getLineage(id)
      const resolved = resolveInherited(found!, ancestors)
      expect(resolved.node.edible?.join(', ')).toBe(expected)
    })
  })
})
