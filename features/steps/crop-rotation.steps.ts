import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { addBed, placePlant, rollOverYear, listRotation } from '../../src/app/garden'
import type { Bed } from '../../src/schema/userData'
import type { BedRotation } from '../../src/lib/rotation'

const feature = await loadFeature('features/crop-rotation.feature')

// A fixed "current year" so an absent holding.year is deterministic in the test env (the real seam
// defaults to the clock). All placements below stamp an explicit year, so this only pins the rest
// window's frame of reference.
const CURRENT_YEAR = 2026

let rotation: BedRotation[] = []

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

/** Place a plant over the whole of the current bed, stamped with `year`. */
async function place(nodeId: string, bedId: string, year: number): Promise<void> {
  const bed = await db.beds.get(bedId)
  const region = { x: 0, y: 0, width: bed!.width, height: bed!.height }
  await placePlant({ nodeId, bedId, region, status: 'growing', year })
}

/** Add a 1×1 bed of a given kind (for the pot/patio exemption). */
async function addKindBed(id: string, kind: string): Promise<void> {
  await addBed({ id, name: id, kind: kind as Bed['kind'], x: 0, y: 0, width: 1, height: 1, spacing: 'free' })
}

/** The bed's rotation entry from the last `listRotation`, if any. */
const bedRotation = (bedId: string): BedRotation | undefined => rotation.find((r) => r.bedId === bedId)

/** How many placements a bed holds for a given year. */
async function countInBedForYear(bedId: string, year: number): Promise<number> {
  const all = await db.holdings.toArray()
  return all.filter((h) => h.bedId === bedId && (h.year ?? CURRENT_YEAR) === year).length
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given, And }) => {
    Given('the store starts empty', async () => {
      rotation = []
      await clearAll()
    })
    And('a veg {string} in family {string}', async (_, id: string, family: string) => {
      await db.nodes.put({ id, rank: 'species', category: 'veg', family, lifecycle: ['annual'] })
    })
    And('a cultivar {string} of {string}', async (_, id: string, parentId: string) => {
      // A cultivar with NO own family/category — it must inherit them from its parent species.
      await db.nodes.put({ id, rank: 'cultivar', parentId })
    })
    And('another veg {string} in family {string}', async (_, id: string, family: string) => {
      await db.nodes.put({ id, rank: 'species', category: 'veg', family, lifecycle: ['annual'] })
    })
    And('a perennial veg {string} in family {string}', async (_, id: string, family: string) => {
      await db.nodes.put({ id, rank: 'species', category: 'veg', family, lifecycle: ['perennial'] })
    })
    And('a fruit {string} in family {string}', async (_, id: string, family: string) => {
      await db.nodes.put({ id, rank: 'species', category: 'fruit', family, lifecycle: ['perennial'] })
    })
    And('a {string} bed {string} measuring {string} by {string}', async (_, _mode: string, id: string, w: string, h: string) => {
      await addBed({ id, name: id, kind: 'bed', x: 0, y: 0, width: parseFloat(w), height: parseFloat(h), spacing: 'free' })
    })
  })

  Scenario('The same family two years running is flagged', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    And('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    When('I check rotation for {int}', async (_, year: number) => {
      rotation = await listRotation(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} is warned', (_, bed: string) => {
      expect(bedRotation(bed)?.conflicts.length ?? 0).toBeGreaterThan(0)
    })
    And('the warning names family {string} last grown in {int}', (_, family: string, year: number) => {
      const c = bedRotation('bed1')!.conflicts.find((x) => x.family === family)
      expect(c).toBeDefined()
      expect(c!.lastYear).toBe(year)
    })
  })

  Scenario('A different family following on is fine', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    And('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    When('I check rotation for {int}', async (_, year: number) => {
      rotation = await listRotation(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} is not warned', (_, bed: string) => {
      expect(bedRotation(bed)?.conflicts ?? []).toEqual([])
    })
  })

  Scenario('A rest longer than the window clears the warning', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    And('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    When('I check rotation for {int}', async (_, year: number) => {
      rotation = await listRotation(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} is not warned', (_, bed: string) => {
      expect(bedRotation(bed)?.conflicts ?? []).toEqual([])
    })
  })

  Scenario('Perennials never trigger a rotation warning', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    And('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    When('I check rotation for {int}', async (_, year: number) => {
      rotation = await listRotation(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} is not warned', (_, bed: string) => {
      expect(bedRotation(bed)?.conflicts ?? []).toEqual([])
    })
  })

  Scenario('A container bed never warns — pots get fresh compost each year', ({ Given, And, When, Then }) => {
    Given('{string} placed on a {string} bed {string} in {int}', async (_, node: string, kind: string, bed: string, year: number) => {
      await addKindBed(bed, kind)
      await place(node, bed, year)
    })
    And('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    When('I check rotation for {int}', async (_, year: number) => {
      rotation = await listRotation(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} is not warned', (_, bed: string) => {
      expect(bedRotation(bed)?.conflicts ?? []).toEqual([])
    })
  })

  Scenario('A perennial-only veg is exempt', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    And('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    When('I check rotation for {int}', async (_, year: number) => {
      rotation = await listRotation(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} is not warned', (_, bed: string) => {
      expect(bedRotation(bed)?.conflicts ?? []).toEqual([])
    })
  })

  Scenario('Rolling a year forward seeds next year and surfaces the clash', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    When('I roll the {int} plot over into {int}', async (_, from: number, to: number) => {
      await rollOverYear(from, to, CURRENT_YEAR)
    })
    Then('{string} holds {int} planting for {int}', async (_, bed: string, n: number, year: number) => {
      expect(await countInBedForYear(bed, year)).toBe(n)
    })
    And('that {int} planting is planned', async (_, year: number) => {
      const all = await db.holdings.toArray()
      const next = all.find((h) => (h.year ?? CURRENT_YEAR) === year)
      expect(next?.status).toBe('planned')
    })
    When('I check rotation for {int}', async (_, year: number) => {
      rotation = await listRotation(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} is warned', (_, bed: string) => {
      expect(bedRotation(bed)?.conflicts.length ?? 0).toBeGreaterThan(0)
    })
    And('the warning names family {string} last grown in {int}', (_, family: string, year: number) => {
      const c = bedRotation('bed1')!.conflicts.find((x) => x.family === family)
      expect(c?.lastYear).toBe(year)
    })
  })

  Scenario('Roll-over will not clobber a year that already has plantings', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    And('{string} placed on {string} in {int}', async (_, node: string, bed: string, year: number) => {
      await place(node, bed, year)
    })
    When('I roll the {int} plot over into {int}', async (_, from: number, to: number) => {
      await rollOverYear(from, to, CURRENT_YEAR)
    })
    Then('{string} holds {int} planting for {int}', async (_, bed: string, n: number, year: number) => {
      expect(await countInBedForYear(bed, year)).toBe(n)
    })
  })
})
