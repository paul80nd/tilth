import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { createNode, updateNode, deleteNode } from '../../src/app/editNode'
import type { NodeFragment } from '../../src/lib/dataset'
import type { PlantNode } from '../../src/schema/plant'

const feature = await loadFeature('features/manage-plants.feature')

type Row = Record<string, string>

/** Import a partial node from a named source (the precondition for the "acquired field" cases). */
async function importNode(source: string, id: string, row: Row): Promise<void> {
  await importFragment({ nodes: [{ id, ...row } as NodeFragment] }, { source })
}

async function editField(id: string, field: keyof PlantNode, value: string): Promise<void> {
  const existing = await db.nodes.get(id)
  if (!existing) throw new Error(`no node "${id}" to edit`)
  await updateNode(existing, { [field]: value })
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

  Scenario('Adding a plant stamps its fields as hand-entered and protects the store', ({ When, Then, And }) => {
    When('I add a plant {string} with commonName {string}', async (_, id: string, commonName: string) => {
      await createNode({ id, commonName })
    })
    Then('node {string} has commonName {string}', async (_, id: string, value: string) => {
      expect((await db.nodes.get(id))?.commonName).toBe(value)
    })
    And('node {string} field {string} came from {string}', async (_, id: string, field: string, source: string) => {
      expect((await db.nodes.get(id))?.provenance?.[field]?.source).toBe(source)
    })
    And('the data source is marked as user-owned', async () => {
      expect(await dataSource()).toBe('user')
    })
  })

  Scenario('Linking a source records the page to enrich the plant from later', ({ When, Then }) => {
    When('I add a plant {string} linking {string} to {string}', async (_, id: string, source: string, url: string) => {
      await createNode({ id, sourceLinks: [{ source, url }] })
    })
    Then('node {string} has a source link to {string} for {string}', async (_, id: string, url: string, source: string) => {
      const link = (await db.nodes.get(id))?.sourceLinks?.find((l) => l.url === url)
      expect(link?.source).toBe(source)
    })
  })

  Scenario('Editing one field re-stamps only that field, preserving an acquired field', ({ Given, When, Then, And }) => {
    Given('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    When('I edit node {string} setting commonName {string}', async (_, id: string, value: string) => {
      await editField(id, 'commonName', value)
    })
    Then('node {string} has commonName {string}', async (_, id: string, value: string) => {
      expect((await db.nodes.get(id))?.commonName).toBe(value)
    })
    And('node {string} commonName is now sourced from {string}', async (_, id: string, source: string) => {
      expect((await db.nodes.get(id))?.provenance?.commonName?.source).toBe(source)
    })
    And('node {string} botanicalName is still sourced from {string}', async (_, id: string, source: string) => {
      expect((await db.nodes.get(id))?.provenance?.botanicalName?.source).toBe(source)
    })
  })

  Scenario('A no-op edit leaves the field\'s provenance alone', ({ Given, When, Then }) => {
    Given('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    When('I edit node {string} setting commonName {string}', async (_, id: string, value: string) => {
      await editField(id, 'commonName', value)
    })
    Then('node {string} field {string} came from {string}', async (_, id: string, field: string, source: string) => {
      expect((await db.nodes.get(id))?.provenance?.[field]?.source).toBe(source)
    })
  })

  Scenario('Deleting a plant removes it from the store', ({ Given, When, Then }) => {
    Given('I import from {string} a node {string} with:', async (_, source: string, id: string, rows: Row[]) => {
      await importNode(source, id, rows[0])
    })
    When('I delete node {string}', async (_, id: string) => {
      await deleteNode(id)
    })
    Then('the store has no node {string}', async (_, id: string) => {
      expect(await db.nodes.get(id)).toBeUndefined()
    })
  })
})
