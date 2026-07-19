import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import {
  addBed,
  updateBed,
  placePlant,
  movePlacement,
  setQuantity,
  setPlacementShape,
  setPlacementColor,
  removeBed,
  holdingsInBed,
  listBeds,
  plotSummary,
  getPlotSize,
  setPlotSize,
} from '../../src/app/garden'
import type { Bed, Holding, PlacementShape } from '../../src/schema/userData'

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

/** Place a plant over the full area of the current bed (optionally as a round/rect single). */
async function placeWholeBed(nodeId: string, bedId: string, shape?: PlacementShape): Promise<Holding> {
  const bed = await db.beds.get(bedId)
  const region = { x: 0, y: 0, width: bed!.width, height: bed!.height }
  lastPlacement = await placePlant({ nodeId, bedId, region, shape, status: 'growing' })
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

  Scenario('A pot holds a single plant whatever its size', ({ Given, When, Then }) => {
    Given('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    When('I place {string} on {string} as a {string} over the whole bed', async (_, node: string, bed: string, shape: string) => {
      await placeWholeBed(node, bed, shape as PlacementShape)
    })
    Then('that planting is a {string} holding with quantity {int}', async (_, shape: string, qty: number) => {
      const h = await reloadPlacement()
      expect(h.shape).toBe(shape)
      expect(h.quantity).toBe(qty)
    })
  })

  Scenario('An espalier holds a single plant over a rectangle', ({ Given, When, Then }) => {
    Given('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    When('I place {string} on {string} as a {string} over the whole bed', async (_, node: string, bed: string, shape: string) => {
      await placeWholeBed(node, bed, shape as PlacementShape)
    })
    Then('that planting is a {string} holding with quantity {int}', async (_, shape: string, qty: number) => {
      const h = await reloadPlacement()
      expect(h.shape).toBe(shape)
      expect(h.quantity).toBe(qty)
    })
  })

  Scenario('Converting an area block to a pot drops it to one plant', ({ Given, And, When, Then }) => {
    Given('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    And('I have placed {string} on {string} over the whole bed', async (_, node: string, bed: string) => {
      await placeWholeBed(node, bed)
    })
    When('I change that planting to a {string}', async (_, shape: string) => {
      await setPlacementShape(lastPlacement!.id, shape as PlacementShape)
    })
    Then('that planting is a {string} holding with quantity {int}', async (_, shape: string, qty: number) => {
      const h = await reloadPlacement()
      expect(h.shape).toBe(shape)
      expect(h.quantity).toBe(qty)
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

  Scenario("Overriding a placement's colour, then resetting it", ({ Given, And, When, Then }) => {
    Given('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    And('I have placed {string} on {string} over the whole bed', async (_, node: string, bed: string) => {
      await placeWholeBed(node, bed)
    })
    When('I set the placement colour to {string}', async (_, color: string) => {
      await setPlacementColor(lastPlacement!.id, color)
    })
    Then('that planting is drawn in {string}', async (_, color: string) => {
      expect((await reloadPlacement()).color).toBe(color)
    })
    When('I reset the placement colour', async () => {
      await setPlacementColor(lastPlacement!.id, undefined)
    })
    Then('that planting has no colour override', async () => {
      expect((await reloadPlacement()).color).toBeUndefined()
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

  Scenario('Resizing the plot from a fixed corner carries the beds with it', ({ Given, And, When, Then }) => {
    Given('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addFreeBed(id, w, h)
    })
    And('bed {string} starts at {string} {string}', async (_, id: string, x: string, y: string) => {
      await updateBed(id, { x: parseFloat(x), y: parseFloat(y) })
    })
    When('I resize the plot to {string} wide anchored {string}', async (_, w: string, anchor: string) => {
      await setPlotSize({ width: parseFloat(w) }, anchor as 'NW' | 'NE' | 'SW' | 'SE')
    })
    Then('the plot is {string} by {string}', async (_, w: string, h: string) => {
      const p = await getPlotSize()
      expect(p.width).toBeCloseTo(parseFloat(w))
      expect(p.height).toBeCloseTo(parseFloat(h))
    })
    And('bed {string} is now at {string} {string}', async (_, id: string, x: string, y: string) => {
      const bed = await db.beds.get(id)
      expect(bed!.x).toBeCloseTo(parseFloat(x))
      expect(bed!.y).toBeCloseTo(parseFloat(y))
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
