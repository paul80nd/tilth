import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import {
  addBed,
  placePlant,
  movePlacement,
  setQuantity,
  removeBed,
  holdingsInBed,
  listBeds,
  plotSummary,
} from '../../src/app/garden'
import type { Bed, Holding } from '../../src/schema/userData'

const feature = await loadFeature('features/garden-plan.feature')

// Cross-step state: the most recent bed placed into and the most recent placement made.
let lastBed: Bed | undefined
let lastPlacement: Holding | undefined

async function clearAll(): Promise<void> {
  await Promise.all([
    db.nodes.clear(),
    db.guides.clear(),
    db.tasks.clear(),
    db.holdings.clear(),
    db.beds.clear(),
    db.jobLog.clear(),
    db.settings.clear(),
  ])
}

async function addFreeBed(id: string, w: string, h: string): Promise<Bed> {
  lastBed = await addBed({
    id,
    name: id,
    kind: 'bed',
    x: 0,
    y: 0,
    width: parseFloat(w),
    height: parseFloat(h),
    spacing: 'free',
  })
  return lastBed
}

/** Place a plant over the full area of the current bed. */
async function placeWholeBed(nodeId: string, bedId: string): Promise<Holding> {
  const bed = await db.beds.get(bedId)
  const region = { x: 0, y: 0, width: bed!.width, height: bed!.height }
  lastPlacement = await placePlant({ nodeId, bedId, region, status: 'growing' })
  return lastPlacement
}

/** Re-read the last placement from the store. */
async function reloadPlacement(): Promise<Holding> {
  return (await db.holdings.get(lastPlacement!.id))!
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given, And }) => {
    Given('the store starts empty', async () => {
      lastBed = undefined
      lastPlacement = undefined
      await clearAll()
    })
    And('a plant {string} with spread {string}', async (_, id: string, spread: string) => {
      await db.nodes.put({ id, rank: 'species', size: { spread } })
    })
    And('a plant {string} with spacing fact {string}', async (_, id: string, spacing: string) => {
      await db.nodes.put({ id, rank: 'species', facts: { spacing } })
    })
  })

  Scenario('Placing a plant on a bed creates a holding with a derived count', ({ Given, When, Then, And }) => {
    Given('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    When('I place {string} on {string} over the whole bed', async (_, node: string, bed: string) => {
      await placeWholeBed(node, bed)
    })
    Then('the bed holds {int} planting', async (_, n: number) => {
      expect(await holdingsInBed(lastBed!.id)).toHaveLength(n)
    })
    And('that planting is a holding of {string} with quantity {int}', async (_, node: string, qty: number) => {
      const h = await reloadPlacement()
      expect(h.nodeId).toBe(node)
      expect(h.quantity).toBe(qty)
    })
    And('that planting records its footprint {string}', async (_, f: string) => {
      expect((await reloadPlacement()).footprint).toBeCloseTo(parseFloat(f))
    })
  })

  Scenario('A denser plant yields a higher count over the same area', ({ Given, When, Then }) => {
    Given('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    When('I place {string} on {string} over the whole bed', async (_, node: string, bed: string) => {
      await placeWholeBed(node, bed)
    })
    Then('that planting is a holding of {string} with quantity {int}', async (_, node: string, qty: number) => {
      const h = await reloadPlacement()
      expect(h.nodeId).toBe(node)
      expect(h.quantity).toBe(qty)
    })
  })

  Scenario('Moving a placement recomputes the count', ({ Given, And, When, Then }) => {
    Given('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    And('I have placed {string} on {string} over the whole bed', async (_, node: string, bed: string) => {
      await placeWholeBed(node, bed)
    })
    When('I move that placement to a region {string} by {string}', async (_, w: string, h: string) => {
      await movePlacement(lastPlacement!.id, { x: 0, y: 0, width: parseFloat(w), height: parseFloat(h) })
    })
    Then('that planting has quantity {int}', async (_, qty: number) => {
      expect((await reloadPlacement()).quantity).toBe(qty)
    })
  })

  Scenario('Overriding the count sticks', ({ Given, And, When, Then }) => {
    Given('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    And('I have placed {string} on {string} over the whole bed', async (_, node: string, bed: string) => {
      await placeWholeBed(node, bed)
    })
    When('I set the placement quantity to {int}', async (_, qty: number) => {
      await setQuantity(lastPlacement!.id, qty)
    })
    Then('that planting has quantity {int}', async (_, qty: number) => {
      expect((await reloadPlacement()).quantity).toBe(qty)
    })
  })

  Scenario('Removing a bed unplaces its plants but keeps the holdings', ({ Given, And, When, Then }) => {
    Given('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    And('I have placed {string} on {string} over the whole bed', async (_, node: string, bed: string) => {
      await placeWholeBed(node, bed)
    })
    When('I remove bed {string}', async (_, id: string) => {
      await removeBed(id)
    })
    Then('there are no beds', async () => {
      expect(await listBeds()).toHaveLength(0)
    })
    And('the store still has the {string} holding', async (_, node: string) => {
      const h = await reloadPlacement()
      expect(h.nodeId).toBe(node)
    })
    And('that holding is no longer placed', async () => {
      const h = await reloadPlacement()
      expect(h.bedId).toBeUndefined()
      expect(h.region).toBeUndefined()
    })
  })

  Scenario('The shopping list totals plants across the plot', ({ Given, And, Then }) => {
    // Two bed lines (a Given + an And) and two placement lines (both And) — the harness matches
    // by keyword+pattern, so the bed pattern is registered under both keywords; the And placement
    // handler serves both placement lines.
    Given('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    And('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    And('I have placed {string} on {string} over the whole bed', async (_, node: string, bed: string) => {
      await placeWholeBed(node, bed)
    })
    And('I have also placed {string} on {string} over the whole bed', async (_, node: string, bed: string) => {
      await placeWholeBed(node, bed)
    })
    Then('the shopping list shows {int} of {string}', async (_, qty: number, node: string) => {
      const total = (await plotSummary()).find((t) => t.nodeId === node)
      expect(total?.quantity).toBe(qty)
    })
  })
})
