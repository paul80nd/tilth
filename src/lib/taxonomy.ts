// Pure taxonomy helpers. Guidance and cheatsheet fields "aggregate down": a cultivar with a
// sparse record inherits its species' (then genus's…) fields as a labelled fallback,
// overriding only what it sets itself — decisions.md "Hierarchy". A whole field is inherited
// or not, matching the merge model (no field-level union). The Dexie walk lives in the app
// layer; this works on an already-fetched ancestor chain so it stays pure and unit-testable.

import type { PlantNode } from '../schema/plant'

/** Cheatsheet-content fields a descendant may borrow from an ancestor. Identity fields
 *  (id, rank, parentId, commonName, variety) and provenance are never inherited. `facts` is
 *  handled separately (it merges per key — see {@link resolveInherited}), not whole-field here. */
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
  /** For each `facts` chip the node did NOT own itself, the ancestor that supplied it (`facts`
   *  merges per key, so provenance is per chip, not whole-field). Own keys are omitted. */
  factsFrom: Record<string, PlantNode>
}

/**
 * Resolve a node's cheatsheet against its ancestor chain (nearest parent first, e.g.
 * [species, genus, family] for a cultivar). A field the node owns wins; otherwise the
 * nearest ancestor that has it fills in, and we record where from so the UI can label it
 * ("from Tomato — species").
 *
 * `facts` is the exception: it **merges per key** (nearest node wins per chip), so a cultivar
 * that owns a single chip still shows the species' other chips — matching the import deep-merge.
 * (conditions/position stay whole-field: a coherent block, deliberately override-whole.)
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

  // `facts` merges per key: apply ancestors far→near, then the node's own last, so the nearest
  // node wins each chip. Track where each chip came from; own chips are dropped from factsFrom.
  const mergedFacts: Record<string, string> = {}
  const originOf: Record<string, PlantNode> = {}
  for (const anc of [...ancestors].reverse()) {
    for (const [key, value] of Object.entries(anc.facts ?? {})) {
      mergedFacts[key] = value
      originOf[key] = anc
    }
  }
  for (const [key, value] of Object.entries(node.facts ?? {})) {
    mergedFacts[key] = value
    originOf[key] = node
  }
  const factsFrom: Record<string, PlantNode> = {}
  for (const [key, origin] of Object.entries(originOf)) {
    if (origin !== node) factsFrom[key] = origin
  }
  if (Object.keys(mergedFacts).length > 0) {
    resolved.facts = mergedFacts
    // Only claim the whole field "from {ancestor}" when the node owns no chips of its own —
    // otherwise the note would lie about a bag that's part own, part inherited.
    if (!node.facts || Object.keys(node.facts).length === 0) {
      inheritedFrom.facts = ancestors.find((a) => a.facts !== undefined)
    }
  }

  return { node: resolved, inheritedFrom, factsFrom }
}
