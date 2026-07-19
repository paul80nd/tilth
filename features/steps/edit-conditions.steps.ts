import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { updateNode, clearNodeField } from '../../src/app/editNode'
import { getLineage } from '../../src/app/plants'
import { resolveInherited } from '../../src/lib/taxonomy'
import { applyConditions, toConditionsDraft } from '../../src/lib/conditionsEdit'
import { soilSet, phSet, type SoilType, type PhLevel } from '../../src/lib/conditions'

const feature = await loadFeature('features/edit-conditions.feature')

const FIXTURE = {
  nodes: [
    {
      id: 'rosa',
      rank: 'species',
      category: 'flower',
      commonName: 'Rose',
      conditions: { soil: ['loam'], moisture: ['moist'], ph: ['neutral'] },
      position: { sun: ['full-sun'], aspect: ['south'], exposure: ['sheltered'], hardiness: 'H4' },
    },
    { id: 'rosa-crimson', rank: 'cultivar', parentId: 'rosa', commonName: 'Rose', variety: 'Crimson' },
  ],
}

// Drives the editor's path: start from the resolved (possibly inherited) conditions, set the two
// facets, and save the node's own `conditions` through the merge seam.
async function editConditions(id: string, soil: string, ph: string): Promise<void> {
  const { node: found, ancestors } = await getLineage(id)
  const resolved = resolveInherited(found!, ancestors)
  const draft = toConditionsDraft(resolved.node.conditions)
  draft.soil = [soil as SoilType]
  draft.ph = [ph as PhLevel]
  await updateNode(found!, { conditions: applyConditions(draft) })
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a rose species carrying its own conditions and position, and a sparse cultivar', async () => {
      await db.nodes.clear()
      await db.settings.clear()
      await importFragment(FIXTURE, { source: 'plant-db' })
    })
  })

  Scenario('Editing conditions saves its own field and leaves position untouched', ({ When, Then, And }) => {
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
    And('node {string} conditions are sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.conditions?.source).toBe(source)
    })
    And('node {string} position is still sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.position?.source).toBe(source)
    })
  })

  Scenario('Editing an inherited card creates a conditions override on the cultivar', ({ When, Then, And }) => {
    When('I edit node {string} conditions setting soil {string} and ph {string}', async (_, id: string, soil: string, ph: string) => {
      await editConditions(id, soil, ph)
    })
    Then('node {string} has its own conditions', async (_, id: string) => {
      expect((await db.nodes.get(id))!.conditions).toBeDefined()
    })
    And('node {string} has soil {string}', async (_, id: string, soil: string) => {
      const saved = await db.nodes.get(id)
      expect(soilSet(saved!.conditions?.soil).has(soil as SoilType)).toBe(true)
    })
    And('node {string} owns no position', async (_, id: string) => {
      expect((await db.nodes.get(id))!.position).toBeUndefined()
    })
  })

  Scenario('Clearing conditions removes only that field', ({ When, Then, And }) => {
    When('I clear node {string} conditions', async (_, id: string) => {
      await clearNodeField(id, 'conditions')
    })
    Then('node {string} has no soil recorded', async (_, id: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.conditions?.soil).toBeUndefined()
      expect(saved!.conditions?.ph).toBeUndefined()
    })
    And('node {string} still has its position', async (_, id: string) => {
      expect((await db.nodes.get(id))!.position).toBeDefined()
    })
  })
})
