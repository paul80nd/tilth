// Pure diff for the in-app diff-review import. An acquire fragment carries only *some* fields;
// before it hits the property-level merge we let the gardener see, per field, what would change
// and untick anything to exclude. This computes that per-field diff (against the existing node)
// and filters a fragment down to the ticked fields. Side-effect-free; the Dexie read/merge live
// in src/app/importReview.ts.

import type { NodeFragment } from './dataset'
import type { PlantNode } from '../schema/plant'
import { deepEqual } from './equal'

export type ChangeStatus = 'new' | 'changed' | 'same'

export interface FieldChange {
  field: string
  status: ChangeStatus
  /** Current stored value; undefined when the node doesn't have this field yet (`new`). */
  existing?: unknown
  incoming: unknown
}

export interface NodeDiff {
  id: string
  /** No node with this id exists yet — the whole fragment is new. */
  isNew: boolean
  /** One entry per field the fragment carries (excluding id/provenance), in fragment order. */
  changes: FieldChange[]
}

// Never diffed: the id keys the node; provenance is the merge's own bookkeeping.
const SKIP = new Set(['id', 'provenance'])

/**
 * Classify each field a fragment supplies against the existing node: `new` (the node lacks it),
 * `changed` (present but different — whole-field, arrays/objects compared structurally), or
 * `same` (identical, so applying it is a no-op).
 */
export function diffNode(existing: PlantNode | undefined, fragment: NodeFragment): NodeDiff {
  const changes: FieldChange[] = []
  for (const [field, incoming] of Object.entries(fragment)) {
    if (SKIP.has(field) || incoming === undefined) continue
    const current = existing ? (existing as unknown as Record<string, unknown>)[field] : undefined
    const status: ChangeStatus =
      current === undefined ? 'new' : deepEqual(current, incoming) ? 'same' : 'changed'
    changes.push({ field, status, existing: current, incoming })
  }
  return { id: fragment.id, isNew: !existing, changes }
}

/** Whether a diff would actually change anything (any new/changed field). */
export function hasChanges(diff: NodeDiff): boolean {
  return diff.changes.some((c) => c.status !== 'same')
}

/**
 * Narrow a fragment to `id` plus the named fields — the ones the gardener kept ticked. The
 * result is a valid fragment for `importFragment`, so only the ticked fields overlay.
 */
export function selectFragment(fragment: NodeFragment, fields: Iterable<string>): NodeFragment {
  const keep = new Set(fields)
  const out: NodeFragment = { id: fragment.id }
  for (const [key, value] of Object.entries(fragment)) {
    if (SKIP.has(key)) continue
    if (keep.has(key)) (out as Record<string, unknown>)[key] = value
  }
  return out
}
