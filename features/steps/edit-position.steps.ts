import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { updateNode, clearNodeField } from '../../src/app/editNode'
import { getLineage } from '../../src/app/plants'
import { resolveInherited } from '../../src/lib/taxonomy'
import { applyPosition, toPositionDraft } from '../../src/lib/positionEdit'
import { lightSet, type LightLevel, type SoilType } from '../../src/lib/conditions'

const feature = await loadFeature('features/edit-position.feature')

const FIXTURE = {
  nodes: [
    {
      id: 'rosa',
      rank: 'species',
      category: 'flower',
      commonName: 'Rose',
      conditions: { soil: ['loam', 'clay'], moisture: ['moist'], ph: ['neutral'] },
      position: { sun: ['partial-shade'], aspect: ['south'], exposure: ['sheltered'], hardiness: 'H4' },
    },
    { id: 'rosa-crimson', rank: 'cultivar', parentId: 'rosa', commonName: 'Rose', variety: 'Crimson' },
  ],
}

// Drives the editor's path: start from the resolved (possibly inherited) position, set the two
// facets, and save the node's own `position` through the merge seam.
async function editPosition(id: string, light: string, hardiness: string): Promise<void> {
  const { node: found, ancestors } = await getLineage(id)
  const resolved = resolveInherited(found!, ancestors)
  const draft = toPositionDraft(resolved.node.position)
  draft.sun = [light as LightLevel]
  draft.hardiness = hardiness
  await updateNode(found!, { position: applyPosition(draft) })
}

async function resolve(id: string) {
  const { node, ancestors } = await getLineage(id)
  return resolveInherited(node!, ancestors)
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a rose species carrying its own position and conditions, and a sparse cultivar', async () => {
      await db.nodes.clear()
      await db.settings.clear()
      await importFragment(FIXTURE, { source: 'plant-db' })
    })
  })

  Scenario('Editing position saves its own field and leaves conditions untouched', ({ When, Then, And }) => {
    When('I edit node {string} position setting light {string} and hardiness {string}', async (_, id: string, light: string, hardiness: string) => {
      await editPosition(id, light, hardiness)
    })
    Then('node {string} light is {string}', async (_, id: string, light: string) => {
      const saved = await db.nodes.get(id)
      expect(lightSet(saved!.position?.sun).has(light as LightLevel)).toBe(true)
    })
    And('node {string} hardiness is {string}', async (_, id: string, hardiness: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.position?.hardiness).toBe(hardiness)
    })
    And('node {string} position is sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.position?.source).toBe(source)
    })
    And('node {string} conditions are still sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.conditions?.source).toBe(source)
    })
  })

  Scenario('Overriding an inherited position leaves conditions inheriting', ({ When, Then, And }) => {
    When('I edit node {string} position setting light {string} and hardiness {string}', async (_, id: string, light: string, hardiness: string) => {
      await editPosition(id, light, hardiness)
    })
    Then('node {string} has its own position', async (_, id: string) => {
      expect((await db.nodes.get(id))!.position).toBeDefined()
    })
    And('node {string} light is {string}', async (_, id: string, light: string) => {
      const saved = await db.nodes.get(id)
      expect(lightSet(saved!.position?.sun).has(light as LightLevel)).toBe(true)
    })
    And('node {string} owns no conditions', async (_, id: string) => {
      expect((await db.nodes.get(id))!.conditions).toBeUndefined()
    })
    And('node {string} resolves soil {string} from its parent', async (_, id: string, soil: string) => {
      const r = await resolve(id)
      expect(r.node.conditions?.soil).toContain(soil as SoilType)
      expect(r.inheritedFrom.conditions).toBeDefined()
    })
  })

  Scenario('Overriding conditions leaves position inheriting', ({ When, Then, And }) => {
    When('I set node {string} soil to {string}', async (_, id: string, soil: string) => {
      const found = await db.nodes.get(id)
      await updateNode(found!, { conditions: { soil: [soil as SoilType] } })
    })
    Then('node {string} has its own conditions', async (_, id: string) => {
      expect((await db.nodes.get(id))!.conditions).toBeDefined()
    })
    And('node {string} owns no position', async (_, id: string) => {
      expect((await db.nodes.get(id))!.position).toBeUndefined()
    })
    And('node {string} resolves light {string} from its parent', async (_, id: string, light: string) => {
      const r = await resolve(id)
      expect(lightSet(r.node.position?.sun).has(light as LightLevel)).toBe(true)
      expect(r.inheritedFrom.position).toBeDefined()
    })
  })

  Scenario('Clearing position removes only that field', ({ When, Then, And }) => {
    When('I clear node {string} position', async (_, id: string) => {
      await clearNodeField(id, 'position')
    })
    Then('node {string} owns no position', async (_, id: string) => {
      expect((await db.nodes.get(id))!.position).toBeUndefined()
    })
    And('node {string} still has soil {string}', async (_, id: string, soil: string) => {
      expect((await db.nodes.get(id))!.conditions?.soil).toContain(soil as SoilType)
    })
    And('node {string} conditions are still sourced from {string}', async (_, id: string, source: string) => {
      expect((await db.nodes.get(id))!.provenance?.conditions?.source).toBe(source)
    })
  })
})
