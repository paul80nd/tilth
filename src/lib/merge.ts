// The defining capability, as a pure function: overlay a partial import fragment onto an
// existing plant node. Property-level merge — present fields overwrite, absent fields are
// left alone, arrays/objects are whole fields (replace, not union). Every overwritten data
// field is stamped with provenance. See docs/decisions.md → "Property-level merge imports".
// Pure + side-effect-free so it's exhaustively unit-testable; the Dexie write lives in the
// app layer.

import type { FieldSource, PlantNode, Rank } from '../schema/plant'

/** Where this fragment's fields came from, applied to every field it sets. */
export interface MergeMeta {
  source: string
  url?: string
  importedAt?: string
}

// Fields that are structural rather than merged data: the key never carries provenance.
const STRUCTURAL = new Set(['id', 'provenance'])

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

  for (const [key, value] of Object.entries(fragment)) {
    if (value === undefined || STRUCTURAL.has(key)) continue
    ;(base as unknown as Record<string, unknown>)[key] = value
    provenance[key] = stamp
  }

  base.id = fragment.id
  base.provenance = provenance
  return base
}
