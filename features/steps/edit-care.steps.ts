import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { saveCareTasks } from '../../src/app/tasks'
import { careDiff, newTaskDraft, toTaskDrafts, type TaskDraft } from '../../src/lib/careEdit'
import { makeTask } from '../../test/factories'

const feature = await loadFeature('features/edit-care.feature')

const parseMonths = (csv: string) =>
  csv.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n))

// Drive the editor's save path: load the current tasks, apply a draft mutation, reconcile + save.
async function editCare(mutate: (drafts: TaskDraft[]) => TaskDraft[]): Promise<void> {
  const initial = await db.tasks.toArray()
  const drafts = mutate(toTaskDrafts(initial))
  const { upserts, deletedIds } = careDiff(initial, drafts)
  await saveCareTasks(upserts, deletedIds)
}

function findByAction(scopeNodeId: string, action: string) {
  return db.tasks.filter((t) => t.scopeNodeId === scopeNodeId && t.action === action).first()
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given, And }) => {
    Given('the store starts empty', async () => {
      await db.tasks.clear()
      await db.settings.clear()
    })
    And('a care job {string} {string} on {string} in months {string} cadence {string}', async (_, id: string, action: string, scope: string, months: string, cadence: string) => {
      await db.tasks.put(
        makeTask({ id, action, months: parseMonths(months), scopeNodeId: scope, cadence: cadence as 'once' | 'ongoing', provenance: { source: 'rhs' } }),
      )
    })
  })

  Scenario('Editing a job\'s note and cadence saves it as hand-entered', ({ When, Then, And }) => {
    When('I set care job {string} note to {string} and cadence {string}', async (_, id: string, note: string, cadence: string) => {
      await editCare((ds) => ds.map((d) => (d.id === id ? { ...d, note, cadence: cadence as TaskDraft['cadence'] } : d)))
    })
    Then('care job {string} note is {string}', async (_, id: string, note: string) => {
      expect((await db.tasks.get(id))?.note).toBe(note)
    })
    And('care job {string} cadence is {string}', async (_, id: string, cadence: string) => {
      expect((await db.tasks.get(id))?.cadence).toBe(cadence)
    })
    And('care job {string} is sourced from {string}', async (_, id: string, source: string) => {
      expect((await db.tasks.get(id))?.provenance?.source).toBe(source)
    })
  })

  Scenario('An unchanged save writes nothing', ({ When, Then }) => {
    When('I open and save the care editor without changes', async () => {
      await editCare((ds) => ds)
    })
    Then('care job {string} is sourced from {string}', async (_, id: string, source: string) => {
      expect((await db.tasks.get(id))?.provenance?.source).toBe(source)
    })
  })

  Scenario('Adding a maintenance job scopes it to the plant', ({ When, Then }) => {
    When('I add a care job {string} on {string} in months {string}', async (_, action: string, scope: string, months: string) => {
      await editCare((ds) => [...ds, { ...newTaskDraft(`task-${scope}-new`, scope), action, months: parseMonths(months) }])
    })
    Then('a care job on {string} with action {string} exists', async (_, scope: string, action: string) => {
      const found = await findByAction(scope, action)
      expect(found, `expected a "${action}" job on ${scope}`).toBeDefined()
      expect(found?.provenance?.source).toBe('manual')
    })
  })

  Scenario('Removing a job deletes it', ({ When, Then }) => {
    When('I remove care job {string}', async (_, id: string) => {
      await editCare((ds) => ds.filter((d) => d.id !== id))
    })
    Then('care job {string} does not exist', async (_, id: string) => {
      expect(await db.tasks.get(id)).toBeUndefined()
    })
  })
})
