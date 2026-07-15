import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importFragment } from '../../src/app/dataset'
import { deleteNode } from '../../src/app/editNode'
import { exportBackup, importBackup } from '../../src/app/backup'
import type { BackupSnapshot } from '../../src/schema/userData'

const feature = await loadFeature('features/backup.feature')

// Cross-step state: the snapshot saved earlier, and the last open error.
let saved: BackupSnapshot | undefined
let openError: Error | undefined

async function clearAll(): Promise<void> {
  await Promise.all([
    db.nodes.clear(),
    db.guides.clear(),
    db.tasks.clear(),
    db.holdings.clear(),
    db.jobLog.clear(),
    db.settings.clear(),
  ])
}

async function importNamed(source: string, id: string, commonName: string): Promise<void> {
  await importFragment({ nodes: [{ id, commonName }] }, { source })
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the store starts empty', async () => {
      saved = undefined
      openError = undefined
      await clearAll()
      expect(await db.nodes.count()).toBe(0)
    })
  })

  Scenario('A backup round-trips every table with provenance intact', ({ Given, And, When, Then }) => {
    Given('I import from {string} a node {string} with common name {string}', async (_, s: string, id: string, cn: string) => {
      await importNamed(s, id, cn)
    })
    And('I have a holding {string} of {string}', async (_, id: string, nodeId: string) => {
      await db.holdings.put({ id, nodeId, status: 'growing' })
    })
    When('I save a backup', async () => {
      saved = await exportBackup()
    })
    And('I wipe all data', async () => {
      await clearAll()
    })
    And('I open that backup', async () => {
      await importBackup(saved)
    })
    Then('node {string} has common name {string}', async (_, id: string, cn: string) => {
      expect((await db.nodes.get(id))?.commonName).toBe(cn)
    })
    And('node {string} provenance for {string} is {string}', async (_, id: string, field: string, source: string) => {
      expect((await db.nodes.get(id))?.provenance?.[field]?.source).toBe(source)
    })
    And('the store holds holding {string}', async (_, id: string) => {
      expect(await db.holdings.get(id)).toBeTruthy()
    })
  })

  Scenario('Opening a backup replaces whatever is in the store now', ({ Given, And, When, Then }) => {
    Given('I import from {string} a node {string} with common name {string}', async (_, s: string, id: string, cn: string) => {
      await importNamed(s, id, cn)
    })
    And('I have saved a backup', async () => {
      saved = await exportBackup()
    })
    When('I import from {string} a node {string} with common name {string}', async (_, s: string, id: string, cn: string) => {
      await importNamed(s, id, cn)
    })
    And('I open that backup', async () => {
      await importBackup(saved)
    })
    Then('the store has node {string}', async (_, id: string) => {
      expect(await db.nodes.get(id)).toBeTruthy()
    })
    And('the store has no node {string}', async (_, id: string) => {
      expect(await db.nodes.get(id)).toBeUndefined()
    })
  })

  Scenario('A restore is a full replace, so a deletion made before it stays gone', ({ Given, And, When, Then }) => {
    Given('I import from {string} a node {string} with common name {string}', async (_, s: string, id: string, cn: string) => {
      await importNamed(s, id, cn)
    })
    And('I import from {string} a node {string} with common name {string}', async (_, s: string, id: string, cn: string) => {
      await importNamed(s, id, cn)
    })
    When('I delete node {string}', async (_, id: string) => {
      await deleteNode(id)
    })
    And('I back up then wipe then restore', async () => {
      saved = await exportBackup()
      await clearAll()
      await importBackup(saved)
    })
    Then('the store still has node {string}', async (_, id: string) => {
      expect(await db.nodes.get(id)).toBeTruthy()
    })
    And('the store still has no node {string}', async (_, id: string) => {
      expect(await db.nodes.get(id)).toBeUndefined()
    })
  })

  Scenario('An unrecognisable file is rejected without touching the store', ({ Given, When, Then, And }) => {
    Given('I import from {string} a node {string} with common name {string}', async (_, s: string, id: string, cn: string) => {
      await importNamed(s, id, cn)
    })
    When('I try to open a backup from {string}', async (_, text: string) => {
      try {
        await importBackup(text)
      } catch (err) {
        openError = err as Error
      }
    })
    Then('opening fails', () => {
      expect(openError).toBeInstanceOf(Error)
    })
    And('the store keeps node {string}', async (_, id: string) => {
      expect(await db.nodes.get(id)).toBeTruthy()
    })
  })
})
