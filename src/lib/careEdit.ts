// Pure helpers for the Care-card editor. The Care tile shows a plant's maintenance TaskTemplates
// (its own + those inherited from an ancestor/category scope). The editor turns them into an
// ordered list of editable draft rows — action, months, note, cadence, scope — that can be added,
// edited and removed. `careDiff` reconciles the edited drafts against what was first loaded into
// the minimal set of upserts (new or changed) + deletes the store write needs. Side-effect-free;
// the Dexie write goes through `saveCareTasks` (which stamps `manual` provenance, whole-record).

import type { Category, TaskTemplate } from '../schema/plant'
import { deepEqual } from './equal'

export interface TaskDraft {
  id: string
  action: string
  months: number[]
  note: string
  /** '' = unclassified (the jobs page treats it as ongoing). */
  cadence: '' | 'once' | 'ongoing'
  scopeNodeId?: string
  scopeCategory?: Category
}

/** Read the tile's tasks into ordered editable rows. */
export function toTaskDrafts(tasks: TaskTemplate[]): TaskDraft[] {
  return tasks.map((t) => ({
    id: t.id,
    action: t.action,
    months: [...t.months],
    note: t.note ?? '',
    cadence: t.cadence ?? '',
    scopeNodeId: t.scopeNodeId,
    scopeCategory: t.scopeCategory,
  }))
}

/** A blank row for a new job, scoped at the plant whose cheatsheet is open. */
export function newTaskDraft(id: string, scopeNodeId: string): TaskDraft {
  return { id, action: '', months: [], note: '', cadence: '', scopeNodeId }
}

/** A draft is savable only once it has a non-blank action. */
export function isTaskDraftValid(d: TaskDraft): boolean {
  return d.action.trim().length > 0
}

/** Rebuild a clean TaskTemplate from a draft (no provenance — the seam stamps it). Trims text,
 *  drops an empty note/cadence, de-dupes + sorts months, preserves the scope. */
export function draftToTask(d: TaskDraft): TaskTemplate {
  const months = [...new Set(d.months.filter((m) => m >= 1 && m <= 12))].sort((a, b) => a - b)
  const task: TaskTemplate = { id: d.id, action: d.action.trim(), months }
  if (d.scopeNodeId) task.scopeNodeId = d.scopeNodeId
  if (d.scopeCategory) task.scopeCategory = d.scopeCategory
  const note = d.note.trim()
  if (note) task.note = note
  if (d.cadence === 'once' || d.cadence === 'ongoing') task.cadence = d.cadence
  return task
}

const withoutProvenance = (t: TaskTemplate): TaskTemplate => {
  const { provenance: _p, ...rest } = t
  return rest
}

/**
 * Reconcile edited drafts against the tasks first loaded: which to upsert (new or changed) and
 * which to delete (an original no longer represented by a valid draft — removed, or its action
 * blanked). Provenance is ignored in the change check (a hand-edit re-stamps it anyway), so a
 * save that touched nothing writes nothing.
 */
export function careDiff(
  initial: TaskTemplate[],
  drafts: TaskDraft[],
): { upserts: TaskTemplate[]; deletedIds: string[] } {
  const initialById = new Map(initial.map((t) => [t.id, t]))
  const valid = drafts.filter(isTaskDraftValid)
  const keptIds = new Set(valid.map((d) => d.id))
  const upserts: TaskTemplate[] = []
  for (const d of valid) {
    const task = draftToTask(d)
    const prev = initialById.get(d.id)
    if (!prev || !deepEqual(task, withoutProvenance(prev))) upserts.push(task)
  }
  const deletedIds = initial.filter((t) => !keptIds.has(t.id)).map((t) => t.id)
  return { upserts, deletedIds }
}
