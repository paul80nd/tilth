import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { getGuidesFor, getLineage } from '../../src/app/plants'
import { resolveInherited } from '../../src/lib/taxonomy'
import type { Guide, PlantNode } from '../../src/schema/plant'

const feature = await loadFeature('features/cheatsheet.feature')

const FIXTURE = {
  nodes: [
    {
      id: 'tomato',
      rank: 'species',
      category: 'veg',
      commonName: 'Tomato',
      calendar: [{ code: 'sow-indoors', months: [3, 4] }],
      conditions: { sun: ['full-sun'] },
      facts: { spacing: '45cm' },
    },
    { id: 't-sb', rank: 'cultivar', parentId: 'tomato', commonName: 'Tomato', variety: 'Sunny Bench', facts: { fruit: 'cherry' } },
  ],
  guides: [{ id: 'guide-sow', title: 'Sowing under cover', kind: 'grow-guide', scopeNodeId: 'tomato' }],
}

// The resolved cheatsheet under test, populated by the "open" step.
let node: PlantNode
let inheritedFrom: Partial<Record<keyof PlantNode, PlantNode>>
let guides: Guide[]

async function open(id: string): Promise<void> {
  const { node: found, ancestors } = await getLineage(id)
  const resolved = resolveInherited(found!, ancestors)
  node = resolved.node
  inheritedFrom = resolved.inheritedFrom
  guides = await getGuidesFor(found!, ancestors)
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a tomato species with a sparse {string} cultivar', async () => {
      await db.nodes.clear()
      await db.guides.clear()
      await db.settings.clear()
      await importFragment(FIXTURE, { source: 'plant-db' })
    })
  })

  Scenario("A sparse cultivar inherits its species' calendar", ({ When, Then }) => {
    When('I open the cheatsheet for {string}', async (_, id: string) => {
      await open(id)
    })
    Then('its calendar is inherited from {string}', (_, ancestorId: string) => {
      expect(node.calendar).toBeDefined()
      expect(inheritedFrom.calendar?.id).toBe(ancestorId)
    })
  })

  Scenario("A cultivar keeps its own fields rather than the species'", ({ When, Then }) => {
    When('I open the cheatsheet for {string}', async (_, id: string) => {
      await open(id)
    })
    Then('its facts are its own, not inherited', () => {
      expect(node.facts).toEqual({ fruit: 'cherry' })
      expect(inheritedFrom.facts).toBeUndefined()
    })
  })

  Scenario('Guidance attached to the species shows on the cultivar', ({ When, Then }) => {
    When('I open the cheatsheet for {string}', async (_, id: string) => {
      await open(id)
    })
    Then('it shows guide {string}', (_, guideId: string) => {
      expect(guides.map((g) => g.id)).toContain(guideId)
    })
  })
})
