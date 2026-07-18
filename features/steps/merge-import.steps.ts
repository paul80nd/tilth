import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import type { NodeFragment } from '../../src/lib/dataset'

const feature = await loadFeature('features/merge-import.feature')

// A data-table row is a header→value map. A key like "facts.sowing depth" targets a nested
// facts chip; any other key is a top-level node field. This lets a scenario declare exactly
// the (partial) fields one source supplies.
type Row = Record<string, string>

function fragmentFromRow(id: string, row: Row): NodeFragment {
  const fragment: NodeFragment = { id }
  const facts: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith('facts.')) facts[key.slice('facts.'.length)] = value
    else (fragment as Record<string, unknown>)[key] = value
  }
  if (Object.keys(facts).length) fragment.facts = facts
  return fragment
}

async function importNode(source: string, id: string, row: Row): Promise<void> {
  await importFragment({ nodes: [fragmentFromRow(id, row)] }, { source })
}

async function importSoil(source: string, id: string, soil: string): Promise<void> {
  await importFragment(
    { nodes: [{ id, conditions: { soil: soil.split(',').map((s) => s.trim()) } }] },
    { source },
  )
}

async function importSun(source: string, id: string, sun: string): Promise<void> {
  await importFragment(
    { nodes: [{ id, conditions: { sun: sun.split(',').map((s) => s.trim()) as never } }] },
    { source },
  )
}

async function importLifecycle(source: string, id: string, lifecycle: string): Promise<void> {
  await importFragment(
    { nodes: [{ id, lifecycle: lifecycle.split(',').map((s) => s.trim()) as never }] },
    { source },
  )
}

async function dataSource(): Promise<unknown> {
  return (await db.settings.get('dataSource'))?.value
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

  Scenario('A second source fills absent fields and leaves present ones alone', ({ Given, When, Then, And }) => {
    Given('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    When('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    Then('node {string} has commonName {string}', async (_, id: string, value: string) => {
      expect((await db.nodes.get(id))?.commonName).toBe(value)
    })
    And('node {string} has botanicalName {string}', async (_, id: string, value: string) => {
      expect((await db.nodes.get(id))?.botanicalName).toBe(value)
    })
    And('node {string} fact {string} is {string}', async (_, id: string, key: string, value: string) => {
      expect((await db.nodes.get(id))?.facts?.[key]).toBe(value)
    })
  })

  Scenario('The same field from a later source overwrites (last import wins)', ({ Given, When, Then }) => {
    Given('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    When('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    Then('node {string} has commonName {string}', async (_, id: string, value: string) => {
      expect((await db.nodes.get(id))?.commonName).toBe(value)
    })
  })

  Scenario('Provenance records which source last set each field', ({ Given, When, Then, And }) => {
    Given('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    When('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    Then('node {string} field {string} came from {string}', async (_, id: string, field: string, source: string) => {
      expect((await db.nodes.get(id))?.provenance?.[field]?.source).toBe(source)
    })
    And('node {string} field {string} came from {string}', async (_, id: string, field: string, source: string) => {
      expect((await db.nodes.get(id))?.provenance?.[field]?.source).toBe(source)
    })
  })

  Scenario('Array fields replace wholesale, they do not union', ({ Given, When, Then }) => {
    Given('I import from {string} a node {string} with soil {string}', async (_, source: string, id: string, soil: string) => {
      await importSoil(source, id, soil)
    })
    When('I import from {string} a node {string} with soil {string}', async (_, source: string, id: string, soil: string) => {
      await importSoil(source, id, soil)
    })
    Then('node {string} soil is {string}', async (_, id: string, expected: string) => {
      expect((await db.nodes.get(id))?.conditions?.soil).toEqual(expected.split(',').map((s) => s.trim()))
    })
  })

  Scenario('Two sources fill different facets of the same conditions object (deep-merge)', ({ Given, When, Then, And }) => {
    Given('I import from {string} a node {string} with soil {string}', async (_, source: string, id: string, soil: string) => {
      await importSoil(source, id, soil)
    })
    When('I import from {string} a node {string} with sun {string}', async (_, source: string, id: string, sun: string) => {
      await importSun(source, id, sun)
    })
    Then('node {string} soil is {string}', async (_, id: string, expected: string) => {
      expect((await db.nodes.get(id))?.conditions?.soil).toEqual(expected.split(',').map((s) => s.trim()))
    })
    And('node {string} sun is {string}', async (_, id: string, expected: string) => {
      expect((await db.nodes.get(id))?.conditions?.sun).toEqual(expected.split(',').map((s) => s.trim()))
    })
  })

  Scenario('A later source adds a fact without clobbering the earlier facts (deep-merge)', ({ Given, When, Then, And }) => {
    Given('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    When('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    Then('node {string} fact {string} is {string}', async (_, id: string, key: string, value: string) => {
      expect((await db.nodes.get(id))?.facts?.[key]).toBe(value)
    })
    And('node {string} fact {string} is {string}', async (_, id: string, key: string, value: string) => {
      expect((await db.nodes.get(id))?.facts?.[key]).toBe(value)
    })
  })

  Scenario('A multi-valued life cycle imports whole and a later partial import leaves it alone', ({ Given, When, Then }) => {
    Given('I import from {string} a node {string} with lifecycle {string}', async (_, source: string, id: string, lifecycle: string) => {
      await importLifecycle(source, id, lifecycle)
    })
    When('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    Then('node {string} lifecycle is {string}', async (_, id: string, expected: string) => {
      expect((await db.nodes.get(id))?.lifecycle).toEqual(expected.split(',').map((s) => s.trim()))
    })
  })

  Scenario('An import marks the store user-owned so the demo re-seed cannot clobber it', ({ When, Then }) => {
    When('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    Then('the data source is marked as user-owned', async () => {
      expect(await dataSource()).toBe('user')
    })
  })

  Scenario('Guides and tasks are upserted whole, with provenance', ({ When, Then, And }) => {
    When('I import from {string} a guide {string} titled {string}', async (_, source: string, id: string, title: string) => {
      await importFragment({ guides: [{ id, title, kind: 'technique' }] }, { source })
    })
    And('I import from {string} a task {string} to {string}', async (_, source: string, id: string, action: string) => {
      await importFragment({ tasks: [{ id, action, months: [6] }] }, { source })
    })
    Then('the store holds guide {string} titled {string}', async (_, id: string, title: string) => {
      expect((await db.guides.get(id))?.title).toBe(title)
    })
    And('the store holds task {string}', async (_, id: string) => {
      expect(await db.tasks.get(id)).toBeTruthy()
    })
    And('guide {string} came from {string}', async (_, id: string, source: string) => {
      expect((await db.guides.get(id))?.provenance?.source).toBe(source)
    })
  })
})
