import Dexie, { type Table } from 'dexie'
import type { PlantNode, Guide, TaskTemplate } from '../schema/plant'
import type { Holding, JobLog, Setting } from '../schema/userData'

// IndexedDB working store. The demo seed is disposable (re-importable), but once a gardener
// hand-authors or merge-imports plants, the reference data (nodes/guides/tasks) is their own
// work — so the durable backup snapshots ALL tables, not just user data (holdings/jobLog/
// settings). See src/app/backup.ts. Mirrors Forkast's split, with Tilth's own stores.
export class TilthDB extends Dexie {
  // Reference (re-importable; nodes are the property-level merge target).
  nodes!: Table<PlantNode, string>
  guides!: Table<Guide, string>
  tasks!: Table<TaskTemplate, string>
  // User data (precious; durable backup is an exported JSON).
  holdings!: Table<Holding, string>
  jobLog!: Table<JobLog, string>
  settings!: Table<Setting, string>

  constructor() {
    super('tilth')
    this.version(1).stores({
      // `parentId` + `rank` indexed so the taxonomy roll-up (jobs/guidance aggregate down)
      // can walk ancestry and query a level; `category` for the browse facet.
      nodes: 'id, rank, parentId, category',
      guides: 'id, scopeNodeId, scopeCategory',
      tasks: 'id, scopeNodeId, scopeCategory',
      holdings: 'id, nodeId, status',
      jobLog: 'id, jobKey, holdingId, nodeId',
      settings: 'key',
    })
  }
}

export const db = new TilthDB()
