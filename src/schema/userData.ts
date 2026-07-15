// User/garden data — the precious, hand-entered layer whose durable backup is an
// exported JSON. Conceptual shapes; the Dexie stores mirror these.

import type { PlantNode, Guide, TaskTemplate } from './plant'

/** Something the user grows (or plans to). An *individual planting* — two apple trees are
 *  two holdings — so notes/photos/location attach per-instance, while the jobs they imply
 *  aggregate up the taxonomy into one de-duplicated list. */
export interface Holding {
  id: string
  /** The reference `PlantNode` this planting is an instance of. */
  nodeId: string
  /** Optional user label to tell instances apart ("the tree by the shed"). */
  label?: string
  /** Where it is — free text for now (bed / border / pot). */
  location?: string
  /** ISO date planted / sown, if known. */
  plantedOn?: string
  quantity?: number
  /** growing = in the ground now; planned = on the wishlist; archived = removed/finished. */
  status: 'growing' | 'planned' | 'archived'
  /** Personal cultivation notes — what you'd do differently, how it did. */
  notes?: string
  /** Local filenames for the user's own photos of this planting. */
  photos?: string[]
}

/** A completed (or snoozed/skipped) job — builds a garden history from day one, the way
 *  Forkast's `cooked` does. Keyed loosely so both calendar-derived jobs and ad-hoc ones
 *  can be logged. */
export interface JobLog {
  id: string
  /** Stable key of the job that was actioned (e.g. `${nodeId}:${action}:${month}`). */
  jobKey: string
  holdingId?: string
  nodeId?: string
  date: string
  outcome?: 'done' | 'snoozed' | 'skipped'
  note?: string
}

/** Free-form key/value settings (e.g. `dataSource`, `region`, `lastFrost`). `dataSource`
 *  guards the first-run demo seed from clobbering real user data, exactly as in Forkast. */
export interface Setting {
  key: string
  value: unknown
}

/** The Save/Open backup envelope — a self-contained snapshot of *every* table, so it is a
 *  true restore point that needs no matching demo file. Unlike Forkast (whose reference data
 *  is disposable), Tilth's reference nodes/guides/tasks can be hand-authored or merge-imported,
 *  so they are precious and travel in the backup too — otherwise a restore would lose exactly
 *  the plants you added. Open restores by replacing all data wholesale (no tombstones — the
 *  saved set itself is the record of what was kept). */
export interface BackupSnapshot {
  version: 1
  exportedAt: string
  nodes: PlantNode[]
  guides: Guide[]
  tasks: TaskTemplate[]
  holdings: Holding[]
  jobLog: JobLog[]
  settings: Setting[]
}
