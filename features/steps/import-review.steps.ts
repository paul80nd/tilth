import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { buildReview, applyReview, type ImportReview } from '../../src/app/importReview'

const feature = await loadFeature('features/import-review.feature')

type Row = Record<string, string>

// Shared across a scenario's steps: the review built by "When I build …".
let review: ImportReview

async function seedNode(id: string, commonName: string, family: string): Promise<void> {
  await db.nodes.put({ id, rank: 'species', commonName, family })
}

async function build(source: string, id: string, row: Row): Promise<void> {
  review = await buildReview({ source, nodes: [{ id, ...row }] })
}

/** Field status in the review for a given node id. */
function fieldStatus(id: string, field: string): string | undefined {
  return review.nodes.find((n) => n.id === id)?.changes.find((c) => c.field === field)?.status
}

async function apply(id: string, fieldsCsv: string): Promise<void> {
  const nodeFields = { [id]: fieldsCsv.split(',').map((s) => s.trim()) }
  await applyReview(review, { nodeFields, guideIds: [], taskIds: [] })
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the store starts empty', async () => {
      await db.nodes.clear()
      await db.guides.clear()
      await db.tasks.clear()
      await db.settings.clear()
      expect(await db.nodes.count()).toBe(0)
    })
  })

  Scenario('The review classifies each incoming field as new, changed or unchanged', ({ Given, When, Then, And }) => {
    Given('a node {string} exists with commonName {string} and family {string}', async (_, id: string, cn: string, fam: string) => {
      await seedNode(id, cn, fam)
    })
    When('I build an import review from a {string} fragment for {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await build(source, id, rows[0])
    })
    Then('the import review for {string} shows:', (_, id: string, rows: Array<{ field: string; status: string }>) => {
      for (const row of rows) expect(fieldStatus(id, row.field)).toBe(row.status)
    })
  })

  Scenario('Applying a selection merges only the ticked fields, leaving the rest alone', ({ Given, When, Then, And }) => {
    Given('a node {string} exists with commonName {string} and family {string}', async (_, id: string, cn: string, fam: string) => {
      await seedNode(id, cn, fam)
    })
    When('I build an import review from a {string} fragment for {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await build(source, id, rows[0])
    })
    And('I apply the review keeping only {string} for {string}', async (_, fields: string, id: string) => {
      await apply(id, fields)
    })
    Then('node {string} has genus {string}', async (_, id: string, value: string) => {
      expect((await db.nodes.get(id))?.genus).toBe(value)
    })
    And('node {string} has family {string}', async (_, id: string, value: string) => {
      expect((await db.nodes.get(id))?.family).toBe(value)
    })
  })

  Scenario('A brand-new node is marked new and imports in full', ({ When, Then, And }) => {
    When('I build an import review from a {string} fragment for {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await build(source, id, rows[0])
    })
    Then('the review marks {string} as new', (_, id: string) => {
      expect(review.nodes.find((n) => n.id === id)?.isNew).toBe(true)
    })
    When('I apply the review keeping only {string} for {string}', async (_, fields: string, id: string) => {
      await apply(id, fields)
    })
    Then('node {string} has commonName {string}', async (_, id: string, value: string) => {
      expect((await db.nodes.get(id))?.commonName).toBe(value)
    })
    And('node {string} has family {string}', async (_, id: string, value: string) => {
      expect((await db.nodes.get(id))?.family).toBe(value)
    })
  })

  Scenario('The store is marked user-owned once an import is applied', ({ When, Then, And }) => {
    When('I build an import review from a {string} fragment for {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await build(source, id, rows[0])
    })
    And('I apply the review keeping only {string} for {string}', async (_, fields: string, id: string) => {
      await apply(id, fields)
    })
    Then('the data source is marked as user-owned', async () => {
      expect((await db.settings.get('dataSource'))?.value).toBe('user')
    })
  })
})
