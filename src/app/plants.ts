// Application layer: reference-data reads for Browse and the Cheatsheet. Pages drive these
// reactively (via dexie-react-hooks useLiveQuery) and compose the results with the pure libs
// (naming / browse / calendar / taxonomy). All Dexie access lives here, never in components.

import { db } from '../db/db'
import { localTaxonomy, type Neighbourhood } from '../lib/neighbourhood'
import type { Guide, PlantNode, TaskTemplate } from '../schema/plant'

/** Every reference node (all ranks). Browse filters this to the browsable ranks. */
export async function listNodes(): Promise<PlantNode[]> {
  return db.nodes.toArray()
}

/** The local taxonomy around a node (its genus's family/species/cultivars) for the cheatsheet's
 *  Neighbourhood card. Undefined when there's no genus to anchor on. */
export async function getNeighbourhood(id: string): Promise<Neighbourhood | undefined> {
  return localTaxonomy(await db.nodes.toArray(), id)
}

export async function getNode(id: string): Promise<PlantNode | undefined> {
  return db.nodes.get(id)
}

/** Distinct fact keys used across the whole collection (own `facts` only) — the vocabulary the
 *  More-facts editor suggests from, so a new fact reuses existing wording. */
export async function listFactKeys(): Promise<string[]> {
  const nodes = await db.nodes.toArray()
  const keys = new Set<string>()
  for (const n of nodes) {
    if (n.facts) for (const k of Object.keys(n.facts)) keys.add(k)
  }
  return [...keys]
}

/**
 * A node's ancestors, nearest-first: [parent, grandparent, …] up the `parentId` chain.
 * Guards against a cycle/among broken data by tracking visited ids.
 */
export async function getAncestors(id: string): Promise<PlantNode[]> {
  const chain: PlantNode[] = []
  const seen = new Set<string>([id])
  let node = await db.nodes.get(id)
  while (node?.parentId && !seen.has(node.parentId)) {
    const parent = await db.nodes.get(node.parentId)
    if (!parent) break
    chain.push(parent)
    seen.add(parent.id)
    node = parent
  }
  return chain
}

/** The full lineage a cheatsheet needs: the node plus its ancestor chain. */
export async function getLineage(id: string): Promise<{ node?: PlantNode; ancestors: PlantNode[] }> {
  const node = await getNode(id)
  const ancestors = node ? await getAncestors(id) : []
  return { node, ancestors }
}

/**
 * Guides relevant to a node: those scoped to the node itself or any ancestor (guidance
 * aggregates down to descendants), plus category-scoped guides for the node's category.
 */
export async function getGuidesFor(node: PlantNode, ancestors: PlantNode[]): Promise<Guide[]> {
  const nodeIds = new Set<string>([node.id, ...ancestors.map((a) => a.id)])
  const all = await db.guides.toArray()
  return all.filter(
    (g) =>
      (g.scopeNodeId && nodeIds.has(g.scopeNodeId)) ||
      (g.scopeCategory && g.scopeCategory === node.category),
  )
}

/**
 * Maintenance tasks relevant to a node: those scoped to the node itself or any ancestor
 * (care aggregates down to descendants, so a species' "winter prune" shows on its cultivars),
 * plus tasks scoped to the node's category (own or inherited). The cheatsheet's Care tile.
 */
export async function getTasksFor(node: PlantNode, ancestors: PlantNode[]): Promise<TaskTemplate[]> {
  const nodeIds = new Set<string>([node.id, ...ancestors.map((a) => a.id)])
  const category = node.category ?? ancestors.find((a) => a.category)?.category
  const all = await db.tasks.toArray()
  return all.filter(
    (t) =>
      (t.scopeNodeId && nodeIds.has(t.scopeNodeId)) ||
      (t.scopeCategory && t.scopeCategory === category),
  )
}
