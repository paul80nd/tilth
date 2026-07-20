// Pure jobs engine. Turns the plants you actually grow into a de-duplicated, month-by-month
// maintenance to-do list — the jobs you'd otherwise forget (winter-prune the apple, thin
// fruitlets after June drop, mulch in spring), NOT the self-evident lifecycle events (you pick
// apples when they ripen; sowing/planting live on the plant calendar + planner, not here).
//
// The one source is TaskTemplates — maintenance jobs attached at a rank or category (acquired
// per-crop from a grow guide). A task scoped at the species aggregates DOWN onto every cultivar
// you grow and de-dupes to ONE job (prune "Apple" once across two apple trees).
//
// Pure: no Dexie, no I/O. The app seam (src/app/jobs.ts) fetches the tables and calls in.

import type { Category, PlantNode, TaskTemplate } from '../schema/plant'
import type { Holding } from '../schema/userData'
import { MONTH_NAMES } from './calendar'

/** 3-letter month labels (Jan…Dec), derived from the full names. */
const MONTH_ABBR = MONTH_NAMES.map((n) => n.slice(0, 3))

const prevMonth = (m: number): number => (m === 1 ? 12 : m - 1)
const nextMonth = (m: number): number => (m === 12 ? 1 : m + 1)

/**
 * A human month window for a task: "Anytime" for no months, a single month ("Mar"), a
 * contiguous run — including one that wraps the year end ("Nov–Feb") — or a comma list for
 * scattered months ("Jun, Sep"). Pure display helper for the Care tile / jobs list.
 */
export function formatMonths(months: number[]): string {
  const set = new Set(months.filter((m) => m >= 1 && m <= 12))
  if (set.size === 0) return 'Anytime'
  const sorted = [...set].sort((a, b) => a - b)
  if (set.size === 1) return MONTH_ABBR[sorted[0] - 1]

  // A single cyclic run has exactly one member whose predecessor is absent (the run's start).
  const starts = sorted.filter((m) => !set.has(prevMonth(m)))
  if (starts.length === 1) {
    let end = starts[0]
    while (set.has(nextMonth(end))) end = nextMonth(end)
    return `${MONTH_ABBR[starts[0] - 1]}–${MONTH_ABBR[end - 1]}`
  }
  return sorted.map((m) => MONTH_ABBR[m - 1]).join(', ')
}

/** One job on the list — a single thing to do, already rolled up across every holding it
 *  applies to (so "prune Apple" appears once, listing both apple trees). */
export interface Job {
  /** Stable key for logging done/snoozed. `task:<id>`. */
  key: string
  /** What to do — the display label. */
  action: string
  /** The node (or category) the job is about — used to label it ("Apple"). */
  subjectId: string
  subjectName: string
  note?: string
  /** Months (1–12) it applies. Empty = condition-based (no fixed month) → the `anytime` bucket. */
  months: number[]
  /** The held plantings this job covers (holding ids). */
  holdingIds: string[]
}

/** A month bucket in the calendar of jobs. */
export interface MonthJobs {
  /** 1 = January … 12 = December. */
  month: number
  name: string
  jobs: Job[]
}

/** The whole rolled-up to-do list: jobs bucketed by month, plus the condition-based ones that
 *  have no fixed month (e.g. "water in dry spells"). */
export interface JobCalendar {
  months: MonthJobs[]
  anytime: Job[]
}

export interface BuildJobsInput {
  holdings: Holding[]
  nodes: PlantNode[]
  tasks: TaskTemplate[]
}

export interface BuildJobsOptions {
  /** Holding statuses that count as "in the garden". Default: just `growing` (a `planned`
   *  wishlist plant isn't yet being maintained; `archived` is finished). */
  statuses?: Array<Holding['status']>
}

/** A display label for a node: common name first, else botanical, else the id. */
function nodeLabel(node: PlantNode | undefined, fallback: string): string {
  return node?.commonName ?? node?.botanicalName ?? fallback
}

function categoryLabel(category: Category): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

/** The id set from a node up through its ancestors (guards a broken parent cycle). */
function lineageIds(startId: string, byId: Map<string, PlantNode>): Set<string> {
  const ids = new Set<string>()
  let current = byId.get(startId)
  while (current && !ids.has(current.id)) {
    ids.add(current.id)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return ids
}

/** The nearest own-or-inherited category up the chain. */
function resolveCategory(startId: string, byId: Map<string, PlantNode>): Category | undefined {
  let current = byId.get(startId)
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    if (current.category) return current.category
    seen.add(current.id)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return undefined
}

/** Stable ordering within a month: by subject, then action, then key (so ties don't flap). */
function compareJobs(a: Job, b: Job): number {
  return (
    a.subjectName.localeCompare(b.subjectName) ||
    a.action.localeCompare(b.action) ||
    a.key.localeCompare(b.key)
  )
}

/**
 * Roll the held plants up into a de-duplicated month-by-month maintenance list. Only plants you
 * hold (per `statuses`) contribute; a task that reaches none of them is omitted.
 */
export function buildJobs(input: BuildJobsInput, options: BuildJobsOptions = {}): JobCalendar {
  const statuses = new Set<Holding['status']>(options.statuses ?? ['growing'])
  const byId = new Map(input.nodes.map((n) => [n.id, n]))
  const held = input.holdings.filter((h) => statuses.has(h.status))

  // Per held planting: the ancestor id set + resolved category, for matching a task's scope.
  const info = new Map<string, { lineage: Set<string>; category?: Category }>()
  for (const h of held) {
    info.set(h.id, {
      lineage: lineageIds(h.nodeId, byId),
      category: resolveCategory(h.nodeId, byId),
    })
  }

  const jobs: Job[] = []
  for (const task of input.tasks) {
    const holdingIds: string[] = []
    for (const h of held) {
      const it = info.get(h.id)!
      const matches =
        (task.scopeNodeId !== undefined && it.lineage.has(task.scopeNodeId)) ||
        (task.scopeCategory !== undefined && it.category === task.scopeCategory)
      if (matches) holdingIds.push(h.id)
    }
    if (!holdingIds.length) continue

    const subjectId = task.scopeNodeId ?? `category:${task.scopeCategory}`
    const subjectName = task.scopeNodeId
      ? nodeLabel(byId.get(task.scopeNodeId), task.scopeNodeId)
      : task.scopeCategory
        ? categoryLabel(task.scopeCategory)
        : 'Garden'
    jobs.push({
      key: `task:${task.id}`,
      action: task.action,
      subjectId,
      subjectName,
      note: task.note,
      months: task.months,
      holdingIds,
    })
  }

  // Bucket by month; empty-month (condition-based) jobs go to `anytime`.
  const months: MonthJobs[] = MONTH_NAMES.map((name, i) => ({ month: i + 1, name, jobs: [] }))
  const anytime: Job[] = []
  for (const job of jobs) {
    if (!job.months.length) {
      anytime.push(job)
      continue
    }
    for (const m of job.months) {
      if (m >= 1 && m <= 12) months[m - 1].jobs.push(job)
    }
  }
  for (const bucket of months) bucket.jobs.sort(compareJobs)
  anytime.sort(compareJobs)

  return { months, anytime }
}
