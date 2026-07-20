// Application layer: the jobs read. Fetches the three tables the pure engine needs (held
// plants, reference nodes for the taxonomy walk, maintenance task templates) and hands them
// to `buildJobs`. All Dexie access lives here; the roll-up/de-dup logic stays pure in the lib.
// Pages drive this reactively (useLiveQuery); the feature tests drive it directly.

import { db } from '../db/db'
import { buildJobs, type BuildJobsOptions, type JobCalendar } from '../lib/jobs'

/** The whole rolled-up, de-duplicated month-by-month job list for the plants you grow. */
export async function listJobs(options?: BuildJobsOptions): Promise<JobCalendar> {
  const [holdings, nodes, tasks] = await Promise.all([
    db.holdings.toArray(),
    db.nodes.toArray(),
    db.tasks.toArray(),
  ])
  return buildJobs({ holdings, nodes, tasks }, options)
}
