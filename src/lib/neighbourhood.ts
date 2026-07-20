// Pure helper for the cheatsheet's "Neighbourhood" card: the local taxonomy around a plant —
// its family, its genus, and every species (with their cultivars) under that genus. Anchored on
// the genus in the node's lineage, so a cultivar, its species and the genus all show the same
// neighbourhood. No I/O — the app layer fetches the nodes; this shapes them and is unit-tested.

import type { PlantNode } from '../schema/plant'

/** One row under the genus: a species (or a cultivar hanging directly off the genus) and, for a
 *  species, the cultivars beneath it. `children` is empty for a genus-direct leaf. */
export interface NeighbourEntry {
  node: PlantNode
  children: PlantNode[]
}

export interface Neighbourhood {
  /** The family above the genus, if the taxonomy records one. */
  family?: PlantNode
  /** The genus this neighbourhood is anchored on. */
  genus: PlantNode
  /** The genus's direct children (species / genus-level cultivars), each with their own children. */
  entries: NeighbourEntry[]
}

const sortKey = (n: PlantNode): string => (n.commonName ?? n.botanicalName ?? n.id).toLowerCase()
const byName = (a: PlantNode, b: PlantNode): number => sortKey(a).localeCompare(sortKey(b))

/**
 * The local taxonomy around `currentId`: walk up to the genus in its lineage, then gather that
 * genus's whole subtree (species → cultivars). Returns `undefined` when there's no genus to
 * anchor on (a family cheatsheet, or a floating node with no genus ancestor) — the card hides.
 */
export function localTaxonomy(nodes: PlantNode[], currentId: string): Neighbourhood | undefined {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const current = byId.get(currentId)
  if (!current) return undefined

  // Lineage, nearest-first, guarding a broken parent cycle.
  const lineage: PlantNode[] = []
  const seen = new Set<string>()
  let cur: PlantNode | undefined = current
  while (cur && !seen.has(cur.id)) {
    lineage.push(cur)
    seen.add(cur.id)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }

  const genus = lineage.find((n) => n.rank === 'genus')
  if (!genus) return undefined
  const family = lineage.find((n) => n.rank === 'family')

  const kids = new Map<string, PlantNode[]>()
  for (const n of nodes) {
    if (!n.parentId) continue
    const arr = kids.get(n.parentId)
    if (arr) arr.push(n)
    else kids.set(n.parentId, [n])
  }

  const entries: NeighbourEntry[] = (kids.get(genus.id) ?? [])
    .slice()
    .sort(byName)
    .map((child) => ({ node: child, children: (kids.get(child.id) ?? []).slice().sort(byName) }))

  return { family, genus, entries }
}
