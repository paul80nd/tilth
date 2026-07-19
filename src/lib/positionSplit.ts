// Migration: split the legacy combined `conditions` (soil + position facets together) into the
// separate `conditions` (soil/moisture/pH) and `position` (light/aspect/exposure/hardiness) fields.
// Runs at every point legacy data enters the app — the Dexie upgrade (live store), the import
// parser, and backup restore — so old backups/fragments/records normalise on the way in. Pure +
// idempotent: a node already in the new shape is returned untouched. See docs/decisions.md →
// "Split position from conditions".

import type { FieldSource, PlantNode } from '../schema/plant'

const POSITION_KEYS = ['sun', 'aspect', 'exposure', 'hardiness'] as const

/** The node-ish shape this migration touches — works for a full node or an import fragment. */
type Splittable = Partial<Pick<PlantNode, 'conditions' | 'position' | 'provenance'>>

/** True if `conditions` still carries any position facet (i.e. it's the legacy combined shape). */
function hasLegacyPosition(conditions: Record<string, unknown> | undefined): boolean {
  return !!conditions && POSITION_KEYS.some((k) => conditions[k] !== undefined)
}

/**
 * Return `node` with any position facets moved out of `conditions` into `position`. Provenance
 * for the split-out `position` is copied from the old `conditions` stamp (they shared one before);
 * an existing own `position` facet wins over the extracted one. A `conditions` left with no soil
 * facets is dropped (with its provenance). Idempotent — a node already split is returned as-is.
 */
export function splitLegacyConditions<T extends Splittable>(node: T): T {
  const legacy = node.conditions as Record<string, unknown> | undefined
  if (!hasLegacyPosition(legacy)) return node

  const position: Record<string, unknown> = { ...(node.position ?? {}) }
  const conditions: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(legacy!)) {
    if ((POSITION_KEYS as readonly string[]).includes(k)) {
      if (position[k] === undefined) position[k] = v
    } else {
      conditions[k] = v
    }
  }

  const provenance: Record<string, FieldSource> | undefined = node.provenance ? { ...node.provenance } : undefined
  if (provenance?.conditions && provenance.position === undefined) provenance.position = provenance.conditions

  const out = { ...node, position } as T & Splittable
  if (provenance) out.provenance = provenance
  if (Object.keys(conditions).length) {
    out.conditions = conditions as PlantNode['conditions']
  } else {
    delete out.conditions
    if (out.provenance) delete out.provenance['conditions']
  }
  return out as T
}
