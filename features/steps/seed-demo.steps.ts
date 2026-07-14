import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect, vi } from 'vitest'
import { db } from '../../src/db/db'
import { seedDemoIfEmpty } from '../../src/db/seed'
import { importFragment } from '../../src/app/dataset'
import { makeNode } from '../../test/factories'

const feature = await loadFeature('features/seed-demo.feature')

// Stand in for the network fetch of public/demo/plants.json so the seed runs its real Dexie
// write path without a dev server. The stub emits a fictional fragment in our schema.
function stubDemoFetch(count: number): void {
  const nodes = Array.from({ length: count }, (_, i) => makeNode({ id: `demo-${i + 1}`, rank: 'species' }))
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    json: async () => ({ version: 1, source: 'demo', nodes }),
  }))
}

async function dataSource(): Promise<unknown> {
  return (await db.settings.get('dataSource'))?.value
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the store is completely empty', async () => {
      vi.unstubAllGlobals()
      await db.nodes.clear()
      await db.guides.clear()
      await db.tasks.clear()
      await db.settings.clear()
      expect(await db.nodes.count()).toBe(0)
    })
  })

  Scenario('First run on an empty store seeds the demo nodes', ({ Given, When, Then, And }) => {
    Given('the bundled demo dataset has {int} nodes', (_, count: number) => stubDemoFetch(count))
    When('the app runs its first-run seed', () => seedDemoIfEmpty())
    Then('the store holds {int} nodes', async (_, count: number) => {
      expect(await db.nodes.count()).toBe(count)
    })
    And('the data source is marked as demo', async () => {
      expect(await dataSource()).toBe('demo')
    })
  })

  Scenario('A newer demo version refreshes existing demo data', ({ Given, And, When, Then }) => {
    Given('the store holds demo data from an older version', async () => {
      await db.nodes.put(makeNode({ id: 'stale' }))
      await db.settings.put({ key: 'dataSource', value: 'demo' })
      await db.settings.put({ key: 'demoVersion', value: 0 }) // any non-current version triggers a refresh
    })
    And('the bundled demo dataset has {int} nodes', (_, count: number) => stubDemoFetch(count))
    When('the app runs its first-run seed', () => seedDemoIfEmpty())
    Then('the store holds {int} nodes', async (_, count: number) => {
      expect(await db.nodes.count()).toBe(count)
    })
    And('the data source is marked as demo', async () => {
      expect(await dataSource()).toBe('demo')
    })
  })

  Scenario("The seed never clobbers a user's own import", ({ Given, And, When, Then }) => {
    Given('I have imported a node {string}', async (_, id: string) => {
      await importFragment({ nodes: [makeNode({ id })] }, { source: 'plant-db' })
    })
    And('the bundled demo dataset has {int} nodes', (_, count: number) => stubDemoFetch(count))
    When('the app runs its first-run seed', () => seedDemoIfEmpty())
    Then('the store holds {int} node', async (_, count: number) => {
      expect(await db.nodes.count()).toBe(count)
    })
    And('node {string} is still present', async (_, id: string) => {
      expect(await db.nodes.get(id)).toBeTruthy()
    })
    And('the data source is marked as user-owned', async () => {
      expect(await dataSource()).toBe('user')
    })
  })
})
