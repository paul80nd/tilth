import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { listDoneKeys, listJobs, toggleJobDone } from '../../src/app/jobs'
import { groupJobsByPlant, jobDoneKey, type JobCalendar, type PlantJobs } from '../../src/lib/jobs'
import { MONTH_NAMES } from '../../src/lib/calendar'
import { makeHolding, makeNode, makeTask } from '../../test/factories'
import type { Category } from '../../src/schema/plant'

const feature = await loadFeature('features/jobs.feature')

// The most recent result of listing the jobs — the "When I list the jobs" step fills it.
let jobs: JobCalendar
// The most recent plant-first grouped view — the "When I group the jobs for {month}" step fills it.
let plants: PlantJobs[]

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

function parseMonths(monthsCsv: string): number[] {
  return monthsCsv
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n))
}

async function addTask(action: string, scopeNodeId: string, monthsCsv: string): Promise<void> {
  await db.tasks.put(
    makeTask({ id: `task-${action}-${scopeNodeId}`, action, months: parseMonths(monthsCsv), scopeNodeId }),
  )
}

async function addNamedSpecies(id: string, name: string, category: string): Promise<void> {
  await db.nodes.put(makeNode({ id, rank: 'species', commonName: name, category: category as Category }))
}

async function addSeasonalSpecies(id: string, name: string, category: string, monthsCsv: string): Promise<void> {
  await db.nodes.put(
    makeNode({
      id,
      rank: 'species',
      commonName: name,
      category: category as Category,
      calendar: [{ code: 'harvest', months: parseMonths(monthsCsv) }],
    }),
  )
}

async function list(): Promise<void> {
  jobs = await listJobs()
}

async function groupFor(month: string): Promise<void> {
  jobs = await listJobs()
  const idx = MONTH_NAMES.indexOf(month)
  plants = groupJobsByPlant(jobs.months[idx].jobs)
}

function plantRow(name: string): PlantJobs | undefined {
  return plants.find((p) => p.subjectName === name)
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

  Scenario("An as-needed task is bounded to the plant's growing season", ({ Given, And, When, Then }) => {
    Given('a species {string} named {string} in category {string} active in months {string}', async (_, id: string, name: string, category: string, months: string) => {
      await addSeasonalSpecies(id, name, category, months)
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
    And('{string} has no jobs', (_, month: string) => {
      expect(monthBucket(month)).toHaveLength(0)
    })
    And('the anytime list does not include {string}', (_, action: string) => {
      expect(jobs.anytime.map((j) => j.action)).not.toContain(action)
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

  Scenario("A plant's maintenance jobs are grouped under it, one row per plant", ({ Given, And, When, Then }) => {
    Given('I grow {string}', async (_, nodeId: string) => {
      await grow(nodeId)
    })
    And('a maintenance task {string} on {string} in months {string}', async (_, action: string, scope: string, months: string) => {
      await addTask(action, scope, months)
    })
    And('another maintenance task {string} on {string} in months {string}', async (_, action: string, scope: string, months: string) => {
      await addTask(action, scope, months)
    })
    When('I group the jobs for {string}', async (_, month: string) => {
      await groupFor(month)
    })
    Then('there is {int} plant row', (_, count: number) => {
      expect(plants).toHaveLength(count)
    })
    And('the plant {string} needs {int} jobs', (_, name: string, count: number) => {
      expect(plantRow(name)?.actions).toHaveLength(count)
    })
    And('the plant {string} includes the job {string}', (_, name: string, action: string) => {
      expect(plantRow(name)?.actions.map((a) => a.action)).toContain(action)
    })
  })

  Scenario('Each plant is its own row — a shared job is not collapsed', ({ Given, And, When, Then }) => {
    Given('I grow {string}', async (_, nodeId: string) => {
      await grow(nodeId)
    })
    And('a species {string} named {string} in category {string}', async (_, id: string, name: string, category: string) => {
      await addNamedSpecies(id, name, category)
    })
    And('I grow {string}', async (_, nodeId: string) => {
      await grow(nodeId)
    })
    And('a maintenance task {string} on {string} in months {string}', async (_, action: string, scope: string, months: string) => {
      await addTask(action, scope, months)
    })
    And('another maintenance task {string} on {string} in months {string}', async (_, action: string, scope: string, months: string) => {
      await addTask(action, scope, months)
    })
    When('I group the jobs for {string}', async (_, month: string) => {
      await groupFor(month)
    })
    Then('there are {int} plant rows', (_, count: number) => {
      expect(plants).toHaveLength(count)
    })
    And('the plant {string} includes the job {string}', (_, name: string, action: string) => {
      expect(plantRow(name)?.actions.map((a) => a.action)).toContain(action)
    })
    And('the plant {string} also includes the job {string}', (_, name: string, action: string) => {
      expect(plantRow(name)?.actions.map((a) => a.action)).toContain(action)
    })
  })

  Scenario('Ticking a one-off job off logs it done for the month, and ticking again clears it', ({ When, Then }) => {
    When('I tick off {string} for {string} in {string}', async (_, action: string, subjectId: string, period: string) => {
      await toggleJobDone(period, subjectId, action)
    })
    Then('the done jobs for {string} include {string} for {string}', async (_, period: string, action: string, subjectId: string) => {
      const keys = await listDoneKeys(period)
      expect(keys.has(jobDoneKey(period, subjectId, action))).toBe(true)
    })
    When('I tick off {string} for {string} in {string} again', async (_, action: string, subjectId: string, period: string) => {
      await toggleJobDone(period, subjectId, action)
    })
    Then('the done jobs for {string} are empty', async (_, period: string) => {
      const keys = await listDoneKeys(period)
      expect(keys.size).toBe(0)
    })
  })
})
