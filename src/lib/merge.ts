// The defining capability, as a pure function: overlay a partial import fragment onto an
// existing plant node. Property-level merge — present fields overwrite, absent fields are
// left alone. A nested OBJECT field (`conditions`, `size`, `seasonalInterest`, `facts`)
// deep-merges key-by-key so two sources can fill different facets of it without clobbering
// each other; ARRAYS and scalars are leaves — the incoming value replaces (a source supplies
// its complete set). Every overwritten data field is stamped with provenance. The hand-edit
// path opts into `objects: 'replace'` (the editor submits the whole object, and omitting a
// facet must remove it). See docs/decisions.md → "Property-level merge imports" + "Deep-merge
// nested objects". Pure + side-effect-free; the Dexie write lives in the app layer.

import type { FieldSource, PlantNode, Rank } from '../schema/plant'
import { isPlainObject } from './equal'

/** How object-valued fields combine. `deep` (default): overlay a source's partial object onto
 *  the existing one, so absent keys survive — how multi-source imports accrete. `replace`: swap
 *  the whole object, which the hand-edit path needs so removing a facet by omission removes it.
 *  Arrays and scalars always replace regardless of this. */
export type ObjectMerge = 'deep' | 'replace'

/** Where this fragment's fields came from, applied to every field it sets. */
export interface MergeMeta {
  source: string
  url?: string
  importedAt?: string
  /** Object-field strategy (default `deep`). A strategy hint, not provenance. */
  objects?: ObjectMerge
}

/**
 * Overlay `incoming` onto `existing` for a single field. Plain objects merge recursively — a
 * key the incoming side omits is left as-is, so different sources fill different facets; arrays
 * and scalars are leaves and `incoming` replaces (a source supplies its complete set, and
 * unioning would accumulate stale values with no way to correct them). Pure: returns fresh
 * objects and never mutates either input. Never deletes a key (absent ⇒ leave alone).
 */
export function mergeField(existing: unknown, incoming: unknown): unknown {
  if (isPlainObject(existing) && isPlainObject(incoming)) {
    const out: Record<string, unknown> = { ...existing }
    for (const [k, v] of Object.entries(incoming)) {
      if (v === undefined) continue
      out[k] = mergeField(existing[k], v)
    }
    return out
  }
  return incoming
}

// Structural fields — they place the node in the taxonomy, they aren't sourced botanical
// data, so they never carry provenance (recording "rank came from X" is meaningless noise in
// the sources footer). `rank`/`parentId` are still *assigned* from the fragment; `id` and
// `provenance` are handled outside the loop, so they're skipped entirely.
const STRUCTURAL = new Set(['id', 'rank', 'parentId', 'provenance'])

/**
 * Overlay `fragment` onto `existing` (or, when there's no existing node, promote the
 * fragment to a full node). Only fields *present* (defined) on the fragment change; absent
 * fields keep their current value and provenance. Returns a new object; inputs are untouched.
 */
export function mergeNode(
  existing: PlantNode | undefined,
  fragment: Partial<PlantNode> & { id: string },
  meta: MergeMeta,
): PlantNode {
  const base: PlantNode = existing
    ? { ...existing }
    : { id: fragment.id, rank: (fragment.rank as Rank) ?? 'cultivar' }

  const provenance: Record<string, FieldSource> = { ...(base.provenance ?? {}) }
  const stamp: FieldSource = { source: meta.source }
  if (meta.url) stamp.url = meta.url
  if (meta.importedAt) stamp.importedAt = meta.importedAt
  const deep = (meta.objects ?? 'deep') === 'deep'

  const bag = base as unknown as Record<string, unknown>
  for (const [key, value] of Object.entries(fragment)) {
    if (value === undefined || key === 'id' || key === 'provenance') continue
    // Deep-merge object fields so sources accrete; `replace` (the edit path) and array/scalar
    // leaves both just take the incoming value. Provenance stays field-level — a deep-merged
    // object is stamped with its latest contributor, not per sub-key.
    bag[key] = deep ? mergeField(bag[key], value) : value
    if (!STRUCTURAL.has(key)) provenance[key] = stamp
  }

  // Enforce the invariant: structural fields never carry provenance. Also self-heals nodes
  // stamped by an earlier version (a pre-existing store/backup) the next time they're merged.
  for (const key of STRUCTURAL) delete provenance[key]

  base.id = fragment.id
  base.provenance = provenance
  return base
}
