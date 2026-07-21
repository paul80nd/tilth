// Application layer: the Save/Open backup use-case. Save snapshots every table into a
// self-contained envelope; Open validates, wipes all data, then restores it wholesale — a
// true restore point that needs no matching demo file and preserves in-app deletions (there
// are no tombstones, so the saved set itself is the record of what was kept). Because Tilth's
// reference nodes/guides/tasks can be hand-authored or merge-imported, they're precious and
// travel in the backup too. Pure validation lives in src/lib/backup.ts; this is the seam the
// UI and the feature tests both drive.

import { db } from '../db/db'
import { markUser, DATA_SOURCE_KEY } from './dataSource'
import { parseBackup, BACKUP_VERSION } from '../lib/backup'
import type { BackupSnapshot } from '../schema/userData'

/** Read every table into a self-contained snapshot. `exportedAt` is injectable so tests are
 *  deterministic; in the app it defaults to now. */
export async function exportBackup(
  exportedAt: string = new Date().toISOString(),
): Promise<BackupSnapshot> {
  const [nodes, guides, tasks, holdings, beds, jobLog, settings] = await db.transaction(
    'r',
    [db.nodes, db.guides, db.tasks, db.holdings, db.beds, db.jobLog, db.settings],
    () =>
      Promise.all([
        db.nodes.toArray(),
        db.guides.toArray(),
        db.tasks.toArray(),
        db.holdings.toArray(),
        db.beds.toArray(),
        db.jobLog.toArray(),
        db.settings.toArray(),
      ]),
  )

  return { version: BACKUP_VERSION, exportedAt, nodes, guides, tasks, holdings, beds, jobLog, settings }
}

export interface RestoreResult {
  /** Reference plant nodes loaded from the snapshot. */
  nodes: number
  /** Holdings (your garden) loaded. */
  holdings: number
  /** Non-fatal validation issues from the file. */
  warnings: string[]
}

/**
 * Restore a backup: validate, wipe every table, then load the snapshot. Accepts the raw JSON
 * text or the parsed object. Throws (without touching the store) when the file isn't a
 * recognisable backup — validation runs before the transaction opens.
 */
export async function importBackup(input: unknown): Promise<RestoreResult> {
  const { snapshot, warnings } = parseBackup(input)

  await db.transaction(
    'rw',
    [db.nodes, db.guides, db.tasks, db.holdings, db.beds, db.jobLog, db.settings],
    async () => {
      await Promise.all([
        db.nodes.clear(),
        db.guides.clear(),
        db.tasks.clear(),
        db.holdings.clear(),
        db.beds.clear(),
        db.jobLog.clear(),
        db.settings.clear(),
      ])
      await Promise.all([
        db.nodes.bulkPut(snapshot.nodes),
        db.guides.bulkPut(snapshot.guides),
        db.tasks.bulkPut(snapshot.tasks),
        db.holdings.bulkPut(snapshot.holdings),
        db.beds.bulkPut(snapshot.beds),
        db.jobLog.bulkPut(snapshot.jobLog),
        db.settings.bulkPut(snapshot.settings),
      ])
      // A restored snapshot with plants is the user's own data; guard against the demo seed
      // clobbering it if the file happened to lack the marker.
      if (snapshot.nodes.length && !snapshot.settings.some((s) => s.key === DATA_SOURCE_KEY)) {
        await markUser()
      }
    },
  )

  return { nodes: snapshot.nodes.length, holdings: snapshot.holdings.length, warnings }
}
