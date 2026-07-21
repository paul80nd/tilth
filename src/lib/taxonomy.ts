// Pure taxonomy helpers. Guidance and cheatsheet fields "aggregate down": a cultivar with a
// sparse record inherits its species' (then genus's…) fields as a labelled fallback,
// overriding only what it sets itself — decisions.md "Hierarchy". A whole field is inherited
// or not, matching the merge model (no field-level union). The Dexie walk lives in the app
// layer; this works on an already-fetched ancestor chain so it stays pure and unit-testable.

import type { PlantNode } from '../schema/plant'

/** Cheatsheet-content fields a descendant may borrow from an ancestor. Identity fields
 *  (id, rank, parentId, commonName, variety) and provenance are never inherited. */
const INHERITABLE: Array<keyof PlantNode> = [
  'category',
  'otherNames',
  'botanicalName',
  'synonyms',
  'family',
  'genus',
  'lifecycle',
  'foliage',
  'habit',
  'calendar',
  'conditions',
  'position',
  'size',
  'seasonalInterest',
  'edible',
  'toxicity',
  'wildlife',
  'uses',
  'facts',
  'summary',
  'image',
]

/**
 * The nearest own-or-inherited value of `field` up a node's ancestor chain (guards a broken parent
 * cycle), resolving against a full id→node map. The map-based sibling of {@link resolveInherited}
 * (which walks a pre-fetched ancestor array) — used by the jobs / rotation / companion engines to
 * roll a holding up to its category / family / genus without materialising the whole chain.
 */
export function resolveUp<K extends keyof PlantNode>(
  startId: string,
  byId: Map<string, PlantNode>,
  field: K,
): PlantNode[K] | undefined {
  let current = byId.get(startId)
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    if (current[field] !== undefined) return current[field]
    seen.add(current.id)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return undefined
}

export interface ResolvedNode {
  /** The node with absent inheritable fields filled from the nearest ancestor that has them. */
  node: PlantNode
  /** For each field the node did NOT supply itself, the ancestor it was borrowed from. */
  inheritedFrom: Partial<Record<keyof PlantNode, PlantNode>>
}

/**
 * Resolve a node's cheatsheet against its ancestor chain (nearest parent first, e.g.
 * [species, genus, family] for a cultivar). A field the node owns wins; otherwise the
 * nearest ancestor that has it fills in, and we record where from so the UI can label it
 * ("from Tomato — species").
 */
export function resolveInherited(node: PlantNode, ancestors: PlantNode[]): ResolvedNode {
  const resolved: PlantNode = { ...node }
  const inheritedFrom: Partial<Record<keyof PlantNode, PlantNode>> = {}

  for (const field of INHERITABLE) {
    if (resolved[field] !== undefined) continue
    const source = ancestors.find((a) => a[field] !== undefined)
    if (source) {
      ;(resolved as unknown as Record<string, unknown>)[field] = source[field]
      inheritedFrom[field] = source
    }
  }

  return { node: resolved, inheritedFrom }
}
