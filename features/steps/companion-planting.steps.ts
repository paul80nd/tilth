import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { addBed, placePlant, listCompanions } from '../../src/app/garden'
import { badCompanionBedIds, type BedCompanions } from '../../src/lib/companions'

const feature = await loadFeature('features/companion-planting.feature')

const CURRENT_YEAR = 2026
let companions: BedCompanions[] = []

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

async function addFreeBed(id: string): Promise<void> {
  await addBed({ id, name: id, kind: 'bed', x: 0, y: 0, width: 1.2, height: 0.6, spacing: 'free' })
}

/** Place a plant over the whole of a bed (year left unset ⇒ current). */
async function place(nodeId: string, bedId: string): Promise<void> {
  const bed = await db.beds.get(bedId)
  await placePlant({ nodeId, bedId, region: { x: 0, y: 0, width: bed!.width, height: bed!.height }, status: 'growing' })
}

/** Does `bedId` have a pairing of the given relation involving both nodes (either side)? */
function hasPairing(bedId: string, relation: 'good' | 'bad', x: string, y: string): boolean {
  const bed = companions.find((b) => b.bedId === bedId)
  return !!bed?.pairings.some((p) => {
    const ids = new Set([...p.aNodeIds, ...p.bNodeIds])
    return p.relation === relation && ids.has(x) && ids.has(y)
  })
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given, And }) => {
    Given('the store starts empty', async () => {
      companions = []
      await clearAll()
    })
    And('the companion test plants', async () => {
      // A fixed fixture (one step, no repeated patterns) spanning the rule shapes used below.
      await db.nodes.bulkPut([
        { id: 'onion', rank: 'species', category: 'veg', family: 'Amaryllidaceae', genus: 'Allium' },
        { id: 'carrot', rank: 'species', category: 'veg', family: 'Apiaceae', genus: 'Daucus' },
        { id: 'bean', rank: 'species', category: 'veg', family: 'Fabaceae', genus: 'Phaseolus' },
        { id: 'cabbage', rank: 'species', category: 'veg', family: 'Brassicaceae', genus: 'Brassica' },
        { id: 'kale', rank: 'cultivar', parentId: 'cabbage' }, // inherits Brassicaceae / Brassica
        { id: 'nasturtium', rank: 'species', category: 'flower', family: 'Tropaeolaceae', genus: 'Tropaeolum' },
        // Two Solanum species so a species-keyed rule (potato) doesn't snag a tomato.
        { id: 'tomato', rank: 'species', category: 'veg', family: 'Solanaceae', genus: 'Solanum', botanicalName: 'Solanum lycopersicum' },
        { id: 'cucumber', rank: 'species', category: 'veg', family: 'Cucurbitaceae', genus: 'Cucumis', botanicalName: 'Cucumis sativus' },
      ])
    })
    And('a {string} bed {string}', async (_, _mode: string, id: string) => {
      await addFreeBed(id)
    })
  })

  Scenario('Good companions sharing a bed are recommended', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string}', async (_, node: string, bed: string) => {
      await place(node, bed)
    })
    And('{string} placed on {string}', async (_, node: string, bed: string) => {
      await place(node, bed)
    })
    When('I check companions for {int}', async (_, year: number) => {
      companions = await listCompanions(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} recommends {string} with {string}', (_, bed: string, x: string, y: string) => {
      expect(hasPairing(bed, 'good', x, y)).toBe(true)
    })
  })

  Scenario('Antagonists sharing a bed are flagged', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string}', async (_, node: string, bed: string) => {
      await place(node, bed)
    })
    And('{string} placed on {string}', async (_, node: string, bed: string) => {
      await place(node, bed)
    })
    When('I check companions for {int}', async (_, year: number) => {
      companions = await listCompanions(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} warns against {string} next to {string}', (_, bed: string, x: string, y: string) => {
      expect(hasPairing(bed, 'bad', x, y)).toBe(true)
    })
    And('{string} is flagged for companions', (_, bed: string) => {
      expect(badCompanionBedIds(companions).has(bed)).toBe(true)
    })
  })

  Scenario('A cultivar pairs via its inherited genus', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string}', async (_, node: string, bed: string) => {
      await place(node, bed)
    })
    And('{string} placed on {string}', async (_, node: string, bed: string) => {
      await place(node, bed)
    })
    When('I check companions for {int}', async (_, year: number) => {
      companions = await listCompanions(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} recommends {string} with {string}', (_, bed: string, x: string, y: string) => {
      expect(hasPairing(bed, 'good', x, y)).toBe(true)
    })
  })

  Scenario('Plants in separate beds are not companions', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string}', async (_, node: string, bed: string) => {
      await place(node, bed)
    })
    And('a second {string} bed {string}', async (_, _mode: string, id: string) => {
      await addFreeBed(id)
    })
    And('{string} placed on {string}', async (_, node: string, bed: string) => {
      await place(node, bed)
    })
    When('I check companions for {int}', async (_, year: number) => {
      companions = await listCompanions(year, { currentYear: CURRENT_YEAR })
    })
    Then('there are no companion pairings', () => {
      expect(companions).toEqual([])
    })
  })

  Scenario('A lone plant has no companions', ({ Given, When, Then }) => {
    Given('{string} placed on {string}', async (_, node: string, bed: string) => {
      await place(node, bed)
    })
    When('I check companions for {int}', async (_, year: number) => {
      companions = await listCompanions(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} has no companion notes', (_, bed: string) => {
      expect(companions.find((b) => b.bedId === bed)).toBeUndefined()
    })
  })

  Scenario('A tomato is not mistaken for a potato', ({ Given, And, When, Then }) => {
    Given('{string} placed on {string}', async (_, node: string, bed: string) => {
      await place(node, bed)
    })
    And('{string} placed on {string}', async (_, node: string, bed: string) => {
      await place(node, bed)
    })
    When('I check companions for {int}', async (_, year: number) => {
      companions = await listCompanions(year, { currentYear: CURRENT_YEAR })
    })
    Then('{string} has no companion notes', (_, bed: string) => {
      expect(companions.find((b) => b.bedId === bed)).toBeUndefined()
    })
  })
})
