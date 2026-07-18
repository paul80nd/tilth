import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { updateNode } from '../../src/app/editNode'
import { getLineage } from '../../src/app/plants'
import { resolveInherited } from '../../src/lib/taxonomy'
import { applyConditions, toConditionsDraft, withoutConditions } from '../../src/lib/conditionsEdit'
import { soilSet, phSet, type SoilType, type PhLevel } from '../../src/lib/conditions'
import { clearNodeField } from '../../src/app/editNode'

const feature = await loadFeature('features/edit-conditions.feature')

const FIXTURE = {
  nodes: [
    {
      id: 'rosa',
      rank: 'species',
      category: 'flower',
      commonName: 'Rose',
      conditions: {
        soil: ['loam'],
        moisture: ['moist'],
        ph: ['neutral'],
        sun: ['full-sun'],
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
async function editConditions(id: string, soil: string, ph: string): Promise<void> {
  const { node: found, ancestors } = await getLineage(id)
  const resolved = resolveInherited(found!, ancestors)
  const draft = toConditionsDraft(resolved.node.conditions)
  draft.soil = [soil as SoilType]
  draft.ph = [ph as PhLevel]
  await updateNode(found!, { conditions: applyConditions(resolved.node.conditions, draft) })
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a rose species carrying full conditions and a sparse cultivar', async () => {
      await db.nodes.clear()
      await db.settings.clear()
      await importFragment(FIXTURE, { source: 'plant-db' })
    })
  })

  Scenario("Editing conditions saves the node's own conditions and keeps the position facets", ({ When, Then, And }) => {
    When('I edit node {string} conditions setting soil {string} and ph {string}', async (_, id: string, soil: string, ph: string) => {
      await editConditions(id, soil, ph)
    })
    Then('node {string} has soil {string}', async (_, id: string, soil: string) => {
      const saved = await db.nodes.get(id)
      expect(soilSet(saved!.conditions?.soil).has(soil as SoilType)).toBe(true)
    })
    And('node {string} has ph {string}', async (_, id: string, ph: string) => {
      const saved = await db.nodes.get(id)
      expect(phSet(saved!.conditions?.ph).has(ph as PhLevel)).toBe(true)
    })
    And('node {string} still has hardiness {string}', async (_, id: string, hardiness: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.conditions?.hardiness).toBe(hardiness)
    })
    And('node {string} conditions are sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.conditions?.source).toBe(source)
    })
  })

  Scenario('Editing an inherited card creates a conditions override on the cultivar', ({ When, Then, And }) => {
    When('I edit node {string} conditions setting soil {string} and ph {string}', async (_, id: string, soil: string, ph: string) => {
      await editConditions(id, soil, ph)
    })
    Then('node {string} has its own conditions', async (_, id: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.conditions).toBeDefined()
    })
    And('node {string} has soil {string}', async (_, id: string, soil: string) => {
      const saved = await db.nodes.get(id)
      expect(soilSet(saved!.conditions?.soil).has(soil as SoilType)).toBe(true)
    })
    And('node {string} still has hardiness {string}', async (_, id: string, hardiness: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.conditions?.hardiness).toBe(hardiness)
    })
    And('node {string} conditions are sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.conditions?.source).toBe(source)
    })
  })

  Scenario('Clearing conditions drops soil and pH but keeps the position half', ({ When, Then, And }) => {
    When('I clear node {string} conditions', async (_, id: string) => {
      const found = await db.nodes.get(id)
      await clearNodeField(id, 'conditions', withoutConditions(found!.conditions))
    })
    Then('node {string} has no soil recorded', async (_, id: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.conditions?.soil).toBeUndefined()
      expect(saved!.conditions?.ph).toBeUndefined()
    })
    And('node {string} still has hardiness {string}', async (_, id: string, hardiness: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.conditions?.hardiness).toBe(hardiness)
    })
    And('node {string} conditions are sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.conditions?.source).toBe(source)
    })
  })
})
