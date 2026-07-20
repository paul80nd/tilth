import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { listJobs } from '../../src/app/jobs'
import type { JobCalendar } from '../../src/lib/jobs'
import { MONTH_NAMES } from '../../src/lib/calendar'
import { makeHolding, makeNode, makeTask } from '../../test/factories'
import type { Category } from '../../src/schema/plant'

const feature = await loadFeature('features/jobs.feature')

// The most recent result of listing the jobs — the "When I list the jobs" step fills it.
let jobs: JobCalendar

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

// --- Step bodies, shared across scenarios (each Scenario binds the ones it uses). ---

async function addSpecies(id: string, category: string): Promise<void> {
  await db.nodes.put(makeNode({ id, rank: 'species', commonName: 'Apple', category: category as Category }))
}

async function addCultivars(csv: string, parentId: string): Promise<void> {
  for (const id of csv.split(',').map((s) => s.trim()).filter(Boolean)) {
    await db.nodes.put(makeNode({ id, rank: 'cultivar', parentId, commonName: 'Apple' }))
  }
}

async function grow(nodeId: string): Promise<void> {
  await db.holdings.put(makeHolding({ id: `holding-${nodeId}`, nodeId, status: 'growing' }))
}

async function addTask(action: string, scopeNodeId: string, monthsCsv: string): Promise<void> {
  const months = monthsCsv
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n))
  await db.tasks.put(makeTask({ id: `task-${action}`, action, months, scopeNodeId }))
}

async function list(): Promise<void> {
  jobs = await listJobs()
}

function monthBucket(name: string) {
  const idx = MONTH_NAMES.indexOf(name)
  return jobs.months[idx].jobs
}

function expectJobInMonth(month: string, action: string, subject: string): void {
  const job = monthBucket(month).find((j) => j.action === action)
  expect(job, `expected "${action}" in ${month}`).toBeDefined()
  expect(job!.subjectName).toBe(subject)
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given, And }) => {
    Given('the store starts empty', async () => {
      await clearAll()
    })
    And('an apple species {string} in category {string}', async (_, id: string, category: string) => {
      await addSpecies(id, category)
    })
    And('cultivars {string} of {string}', async (_, csv: string, parentId: string) => {
      await addCultivars(csv, parentId)
    })
  })

  Scenario('A maintenance task on the species shows up under each of its months for a held cultivar', ({ Given, And, When, Then }) => {
    Given('I grow {string}', async (_, nodeId: string) => {
      await grow(nodeId)
    })
    And('a maintenance task {string} on {string} in months {string}', async (_, action: string, scope: string, months: string) => {
      await addTask(action, scope, months)
    })
    When('I list the jobs', list)
    Then('{string} includes the job {string} for {string}', (_, month: string, action: string, subject: string) => {
      expectJobInMonth(month, action, subject)
    })
    And('{string} includes the job {string} for {string}', (_, month: string, action: string, subject: string) => {
      expectJobInMonth(month, action, subject)
    })
    And('{string} has no jobs', (_, month: string) => {
      expect(monthBucket(month)).toHaveLength(0)
    })
  })

  Scenario('One job de-duplicates across two cultivars of the same species', ({ Given, And, When, Then }) => {
    Given('I grow {string}', async (_, nodeId: string) => {
      await grow(nodeId)
    })
    And('I grow {string}', async (_, nodeId: string) => {
      await grow(nodeId)
    })
    And('a maintenance task {string} on {string} in months {string}', async (_, action: string, scope: string, months: string) => {
      await addTask(action, scope, months)
    })
    When('I list the jobs', list)
    Then('{string} includes the job {string} for {string}', (_, month: string, action: string, subject: string) => {
      expectJobInMonth(month, action, subject)
    })
    And('{string} has {int} job', (_, month: string, count: number) => {
      expect(monthBucket(month)).toHaveLength(count)
    })
    And('the job {string} covers {int} plantings', (_, action: string, count: number) => {
      const job = jobs.months.flatMap((m) => m.jobs).find((j) => j.action === action)
      expect(job?.holdingIds).toHaveLength(count)
    })
  })

  Scenario('A condition-based task with no months lands in the anytime bucket', ({ Given, And, When, Then }) => {
    Given('I grow {string}', async (_, nodeId: string) => {
      await grow(nodeId)
    })
    And('a maintenance task {string} on {string} in months {string}', async (_, action: string, scope: string, months: string) => {
      await addTask(action, scope, months)
    })
    When('I list the jobs', list)
    Then('the anytime list includes {string}', (_, action: string) => {
      expect(jobs.anytime.map((j) => j.action)).toContain(action)
    })
    And('{string} has no jobs', (_, month: string) => {
      expect(monthBucket(month)).toHaveLength(0)
    })
  })

  Scenario('Jobs only cover plants I actually grow', ({ Given, When, Then }) => {
    Given('a maintenance task {string} on {string} in months {string}', async (_, action: string, scope: string, months: string) => {
      await addTask(action, scope, months)
    })
    When('I list the jobs', list)
    Then('{string} has no jobs', (_, month: string) => {
      expect(monthBucket(month)).toHaveLength(0)
    })
  })
})
