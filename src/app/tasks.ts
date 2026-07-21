// Application layer: hand-editing maintenance tasks from the cheatsheet's Care card. Unlike node
// fields (which overlay through the merge engine), a TaskTemplate is a whole record, so a hand edit
// is a plain upsert stamped `manual` — provenance stays honest and a later acquire overlays cleanly.
// Deletion has no provenance, so it's a direct store delete. Both mark the store user-owned so a
// demo re-seed can't resurrect what you changed. This is the seam the Care editor and feature tests
// drive; the pure reconcile (which tasks to upsert/delete) lives in src/lib/careEdit.ts.

import { db } from '../db/db'
import { MANUAL_SOURCE } from './editNode'
import { markUser } from './dataSource'
import type { TaskTemplate } from '../schema/plant'

/** Persist Care-card edits in one transaction: upsert new/changed tasks (stamped `manual`, whole
 *  record), delete removed ones, and mark the store user-owned. A no-op save writes nothing. */
export async function saveCareTasks(upserts: TaskTemplate[], deletedIds: string[]): Promise<void> {
  if (!upserts.length && !deletedIds.length) return
  await db.transaction('rw', db.tasks, db.settings, async () => {
    for (const id of deletedIds) await db.tasks.delete(id)
    for (const t of upserts) await db.tasks.put({ ...t, provenance: { source: MANUAL_SOURCE } })
    await markUser()
  })
}
