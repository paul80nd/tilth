import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { updateNode, clearNodeField } from '../../src/app/editNode'
import { getLineage } from '../../src/app/plants'
import { resolveInherited } from '../../src/lib/taxonomy'
import { PHASE_ORDER, seasonalInterest } from '../../src/lib/calendar'
import { toDraft, fromDraft } from '../../src/lib/seasonalEdit'
import type { InterestPart, PlantNode, Season } from '../../src/schema/plant'

const feature = await loadFeature('features/seasonal-interest.feature')

const FIXTURE = {
  nodes: [
    {
      id: 'malus-domestica',
      rank: 'species',
      category: 'fruit',
      commonName: 'Apple',
      calendar: [
        { code: 'prune', months: [1, 2] },
        { code: 'thin', months: [6] },
        { code: 'harvest', months: [9, 10] },
      ],
      seasonalInterest: {
        spring: { foliage: ['green'], flower: ['pink'] },
        summer: { foliage: ['green'], fruit: ['green'] },
        autumn: { foliage: ['green'], fruit: ['orange', 'red'] },
      },
    },
    { id: 'red-falstaff', rank: 'cultivar', parentId: 'malus-domestica', commonName: 'Apple', variety: 'Red Falstaff' },
  ],
}

let node: PlantNode
let inheritedFrom: Partial<Record<keyof PlantNode, PlantNode>>
let calendarBefore: string

async function open(id: string): Promise<void> {
  const { node: found, ancestors } = await getLineage(id)
  const resolved = resolveInherited(found!, ancestors)
  node = resolved.node
  inheritedFrom = resolved.inheritedFrom
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('an apple species carrying a seasonal-interest grid and a job calendar', async () => {
      await db.nodes.clear()
      await db.settings.clear()
      await importFragment(FIXTURE, { source: 'plant-db' })
    })
  })

  Scenario('Seasonal interest is stored as its own field, separate from the calendar', ({ When, Then, And }) => {
    When('I load the apple', async () => {
      await open('malus-domestica')
    })
    Then('its calendar holds only actionable jobs', () => {
      expect(node.calendar!.length).toBeGreaterThan(0)
      expect(node.calendar!.every((s) => (PHASE_ORDER as string[]).includes(s.code))).toBe(true)
    })
    And('its seasonal interest lists {string} in {string}', (_, part: string, season: string) => {
      expect(node.seasonalInterest?.[season as 'spring']?.[part as 'flower']).toBeDefined()
    })
  })

  Scenario('The strip resolves each season\'s parts and colours from the grid', ({ When, Then }) => {
    When('I load the apple', async () => {
      await open('malus-domestica')
    })
    Then('in {string} the strip shows {string} coloured {string}', (_, season: string, part: string, colours: string) => {
      const seasonName = season[0].toUpperCase() + season.slice(1)
      const row = seasonalInterest(node.seasonalInterest).find((s) => s.season === seasonName)!
      const cell = row.parts.find((p) => p.code === part)!
      expect(cell.colours.join(', ')).toBe(colours)
    })
  })

  Scenario("A sparse cultivar inherits its species' seasonal interest", ({ When, Then }) => {
    When('I load the {string} cultivar', async (_, id: string) => {
      await open(id)
    })
    Then('its seasonal interest is inherited from {string}', (_, ancestorId: string) => {
      expect(node.seasonalInterest).toBeDefined()
      expect(inheritedFrom.seasonalInterest?.id).toBe(ancestorId)
    })
  })

  Scenario('A later import overlays seasonal interest and leaves the calendar untouched', ({ When, Then, And }) => {
    When('I import a seasonal-interest-only fragment for the apple', async () => {
      const before = (await getLineage('malus-domestica')).node!
      calendarBefore = JSON.stringify(before.calendar)
      await importFragment(
        { nodes: [{ id: 'malus-domestica', seasonalInterest: { summer: { flower: ['white'] } } }] },
        { source: 'plant-db' },
      )
      await open('malus-domestica')
    })
    Then('its seasonal interest lists {string} in {string}', (_, part: string, season: string) => {
      expect(node.seasonalInterest?.[season as 'summer']?.[part as 'flower']).toEqual(['white'])
    })
    And('its job calendar is unchanged', () => {
      expect(JSON.stringify(node.calendar)).toBe(calendarBefore)
    })
  })

  // Drives the exact path the editor takes: start from the resolved (possibly inherited) grid,
  // toggle one cell on with a colour, and save through the merge seam.
  async function editInterest(id: string, part: InterestPart, colours: string, season: Season): Promise<void> {
    const { node: found, ancestors } = await getLineage(id)
    const resolved = resolveInherited(found!, ancestors)
    const draft = toDraft(resolved.node.seasonalInterest)
    draft[season][part] = { on: true, colours }
    await updateNode(found!, { seasonalInterest: fromDraft(draft) })
  }

  Scenario("Editing a plant's seasonal interest saves its own grid as hand-entered", ({ When, Then, And }) => {
    When('I edit node {string} seasonal interest to show {string} coloured {string} in {string}', async (_, id: string, part: string, colours: string, season: string) => {
      await editInterest(id, part as InterestPart, colours, season as Season)
    })
    Then('node {string} records {string} interest in {string}', async (_, id: string, part: string, season: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.seasonalInterest?.[season as Season]?.[part as InterestPart]).toBeDefined()
    })
    And('node {string} seasonal interest is sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.seasonalInterest?.source).toBe(source)
    })
  })

  Scenario('Editing an inherited grid creates an override on the cultivar', ({ When, Then, And }) => {
    When('I edit node {string} seasonal interest to show {string} coloured {string} in {string}', async (_, id: string, part: string, colours: string, season: string) => {
      await editInterest(id, part as InterestPart, colours, season as Season)
    })
    Then('node {string} has its own seasonal interest', async (_, id: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.seasonalInterest).toBeDefined()
    })
    And('node {string} seasonal interest is sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.seasonalInterest?.source).toBe(source)
    })
  })

  Scenario("Clearing a cultivar's seasonal-interest override re-inherits from the species", ({ When, Then, And }) => {
    When('I give node {string} its own seasonal interest then clear it', async (_, id: string) => {
      const { node: found } = await getLineage(id)
      await updateNode(found!, { seasonalInterest: { winter: { stem: ['red'] } } })
      await clearNodeField(id, 'seasonalInterest')
    })
    Then('node {string} has no own seasonal interest', async (_, id: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.seasonalInterest).toBeUndefined()
    })
    And('node {string} resolves seasonal interest from {string}', async (_, id: string, ancestorId: string) => {
      const { node: found, ancestors } = await getLineage(id)
      const resolved = resolveInherited(found!, ancestors)
      expect(resolved.inheritedFrom.seasonalInterest?.id).toBe(ancestorId)
    })
  })
})
