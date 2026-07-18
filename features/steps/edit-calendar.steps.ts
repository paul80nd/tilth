import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { updateNode, clearNodeField } from '../../src/app/editNode'
import { getLineage } from '../../src/app/plants'
import { resolveInherited } from '../../src/lib/taxonomy'
import { toCalendarDraft, fromCalendarDraft } from '../../src/lib/calendarEdit'

const feature = await loadFeature('features/edit-calendar.feature')

const FIXTURE = {
  nodes: [
    {
      id: 'malus',
      rank: 'species',
      category: 'fruit',
      commonName: 'Apple',
      calendar: [
        { code: 'plant-out', months: [1, 2] },
        { code: 'harvest', months: [8] },
      ],
    },
    { id: 'malus-crimson', rank: 'cultivar', parentId: 'malus', commonName: 'Apple', variety: 'Crimson' },
  ],
}

/** Parse "9,10" → [9, 10]. */
function months(list: string): number[] {
  return list.split(',').map((s) => Number(s.trim()))
}

// Drives the exact path the editor takes: start from the resolved (possibly inherited) calendar,
// set a code's months, and save through the merge seam.
async function editHarvest(id: string, monthList: string): Promise<void> {
  const { node: found, ancestors } = await getLineage(id)
  const resolved = resolveInherited(found!, ancestors)
  const draft = toCalendarDraft(resolved.node.calendar)
  draft['harvest'].months = Array.from({ length: 12 }, (_, i) => months(monthList).includes(i + 1))
  await updateNode(found!, { calendar: fromCalendarDraft(draft) })
}

/** The months a code is active in a saved node's calendar. */
async function savedMonths(id: string, code: string): Promise<number[]> {
  const saved = await db.nodes.get(id)
  return saved!.calendar?.find((s) => s.code === code)?.months ?? []
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('an apple species carrying a calendar and a sparse cultivar', async () => {
      await db.nodes.clear()
      await db.settings.clear()
      await importFragment(FIXTURE, { source: 'plant-db' })
    })
  })

  Scenario("Editing the calendar saves the node's own calendar as hand-entered", ({ When, Then, And }) => {
    When('I edit node {string} calendar setting harvest in months {string}', async (_, id: string, monthList: string) => {
      await editHarvest(id, monthList)
    })
    Then('node {string} has harvest in months {string}', async (_, id: string, monthList: string) => {
      expect(await savedMonths(id, 'harvest')).toEqual(months(monthList))
    })
    And('node {string} calendar is sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.calendar?.source).toBe(source)
    })
  })

  Scenario('Editing an inherited calendar creates an override on the cultivar', ({ When, Then, And }) => {
    When('I edit node {string} calendar setting harvest in months {string}', async (_, id: string, monthList: string) => {
      await editHarvest(id, monthList)
    })
    Then('node {string} has its own calendar', async (_, id: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.calendar).toBeDefined()
    })
    And('node {string} has harvest in months {string}', async (_, id: string, monthList: string) => {
      expect(await savedMonths(id, 'harvest')).toEqual(months(monthList))
    })
    And('node {string} calendar is sourced from {string}', async (_, id: string, source: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.provenance?.calendar?.source).toBe(source)
    })
  })

  Scenario("Clearing a cultivar's calendar override re-inherits from the species", ({ When, Then, And }) => {
    When('I give node {string} its own calendar then clear it', async (_, id: string) => {
      const { node: found } = await getLineage(id)
      await updateNode(found!, { calendar: [{ code: 'flowers', months: [3] }] })
      await clearNodeField(id, 'calendar')
    })
    Then('node {string} has no own calendar', async (_, id: string) => {
      const saved = await db.nodes.get(id)
      expect(saved!.calendar).toBeUndefined()
    })
    And('node {string} resolves harvest in months {string} from the species', async (_, id: string, monthList: string) => {
      const { node: found, ancestors } = await getLineage(id)
      const resolved = resolveInherited(found!, ancestors)
      expect(resolved.node.calendar?.find((s) => s.code === 'harvest')?.months).toEqual(months(monthList))
    })
  })
})
