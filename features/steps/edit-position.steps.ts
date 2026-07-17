import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { updateNode } from '../../src/app/editNode'
import { getLineage } from '../../src/app/plants'
import { resolveInherited } from '../../src/lib/taxonomy'
import { applyPosition, toPositionDraft } from '../../src/lib/positionEdit'
import { lightSet, type LightLevel } from '../../src/lib/conditions'
import type { SoilType } from '../../src/lib/conditions'

const feature = await loadFeature('features/edit-position.feature')

const FIXTURE = {
  nodes: [
    {
      id: 'rosa',
      rank: 'species',
      category: 'flower',
      commonName: 'Rose',
      conditions: {
        soil: ['loam', 'clay'],
        moisture: ['moist'],
        ph: ['neutral'],
        sun: ['partial-shade'],
        aspect: ['south'],
        exposure: ['sheltered'],
        hardiness: 'H4',
      },
    },
    { id: 'rosa-crimson', rank: 'cultivar', parentId: 'rosa', commonName: 'Rose', variety: 'Crimson' },
  ],
}

// Drives the exact path the editor takes: start from the resolved (possibly inherited) conditions,
// set the two facets, and save through the merge seam.
async function editPosition(id: string, light: string, hardiness: string): Promise<void> {
  const { node: found, ancestors } = await getLineage(id)
  const resolved = resolveInherited(found!, ancestors)
  const draft = toPositionDraft(resolved.node.conditions)
  draft.sun = [light as LightLevel]
  draft.hardiness = hardiness
  await updateNode(found!, { conditions: applyPosition(resolved.node.conditions, draft) })
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a rose species carrying full conditions and a sparse cultivar', async () => {
      await db.nodes.clear()
      await db.settings.clear()
      await importFragment(FIXTURE, { source: 'plant-db' })
    })
  })

  Scenario("Editing position saves the node's own conditions and keeps soil/moisture/pH", ({ When, Then, And }) => {
    When('I edit node {string} position setting light {string} and hardiness {string}', async (_, id: string, light: string, hardiness: string) => {
      await editPosition(id, light, hardiness)
    })
    Then('node {string} light is {string}', async (_, id: string, light: string) => {
      const saved = await db.nodes.get(id)
      expect(lightSet(saved!.conditions?.sun).has(light as LightLevel)).toBe(true)
    })
    And('node {string} hardiness is {string}', async (_, id: string, hardiness: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.conditions?.hardiness).toBe(hardiness)
    })
    And('node {string} still has soil {string}', async (_, id: string, soil: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.conditions?.soil).toContain(soil as SoilType)
    })
    And('node {string} conditions are sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.conditions?.source).toBe(source)
    })
  })

  Scenario('Editing an inherited position creates an override on the cultivar', ({ When, Then, And }) => {
    When('I edit node {string} position setting light {string} and hardiness {string}', async (_, id: string, light: string, hardiness: string) => {
      await editPosition(id, light, hardiness)
    })
    Then('node {string} has its own conditions', async (_, id: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.conditions).toBeDefined()
    })
    And('node {string} light is {string}', async (_, id: string, light: string) => {
      const saved = await db.nodes.get(id)
      expect(lightSet(saved!.conditions?.sun).has(light as LightLevel)).toBe(true)
    })
    And('node {string} still has soil {string}', async (_, id: string, soil: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.conditions?.soil).toContain(soil as SoilType)
    })
    And('node {string} conditions are sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.conditions?.source).toBe(source)
    })
  })
})
