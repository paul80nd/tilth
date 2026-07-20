// Application layer: the jobs read. Fetches the three tables the pure engine needs (held
// plants, reference nodes for the taxonomy walk, maintenance task templates) and hands them
// to `buildJobs`. All Dexie access lives here; the roll-up/de-dup logic stays pure in the lib.
// Pages drive this reactively (useLiveQuery); the feature tests drive it directly.

import { db } from '../db/db'
import { buildJobs, jobDoneKey, type BuildJobsOptions, type JobCalendar } from '../lib/jobs'

/** The whole rolled-up, de-duplicated month-by-month job list for the plants you grow. */
export async function listJobs(options?: BuildJobsOptions): Promise<JobCalendar> {
  const [holdings, nodes, tasks] = await Promise.all([
    db.holdings.toArray(),
    db.nodes.toArray(),
    db.tasks.toArray(),
  ])
  return buildJobs({ holdings, nodes, tasks }, options)
}

/** The set of job keys ticked done in a `YYYY-MM` period — the page checks membership per row. */
export async function listDoneKeys(period: string): Promise<Set<string>> {
  const rows = await db.jobLog.where('jobKey').startsWith(`${period}:`).toArray()
  return new Set(rows.filter((r) => r.outcome === 'done').map((r) => r.jobKey))
}

/** Toggle a one-off job's done state for a period: add a jobLog row if absent, remove if present.
 *  The `jobDoneKey` is the row id, so this is a plain get/delete — no query to reconcile. */
export async function toggleJobDone(period: string, subjectId: string, action: string): Promise<void> {
  const jobKey = jobDoneKey(period, subjectId, action)
  const existing = await db.jobLog.get(jobKey)
  if (existing) {
    await db.jobLog.delete(jobKey)
  } else {
    await db.jobLog.put({
      id: jobKey,
      jobKey,
      nodeId: subjectId,
      date: new Date().toISOString(),
      outcome: 'done',
    })
  }
}
