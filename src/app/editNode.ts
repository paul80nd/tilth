// Application layer: hand-authoring reference nodes (the add/edit/delete plant form). Manual
// entry is just *another source* in the same merge engine — create/edit route through
// `importFragment` stamped with the opaque `manual` key, so provenance stays honest and a
// later acquire (e.g. "plant-db") overlays cleanly, showing your hand-typed value vs the incoming
// one in the diff. Delete is not a merge concept, so it's a direct store delete. This is the
// seam the form and the feature tests both drive; pure helpers live in src/lib/editNode.ts.

import { db } from '../db/db'
import { importFragment } from './dataset'
import { nodeDiff, isEmptyDiff } from '../lib/editNode'
import type { NodeFragment } from '../lib/dataset'
import type { PlantNode } from '../schema/plant'

/** Provenance key for hand-entered fields. Opaque (like every source key) — no firewall issue. */
export const MANUAL_SOURCE = 'manual'

/**
 * Create a new node from hand-entered fields; every field provided is stamped `manual`.
 * Throws if the id is already taken (the merge would otherwise silently overlay an existing
 * plant) so the form can ask the gardener to disambiguate.
 */
export async function createNode(node: NodeFragment): Promise<void> {
  if (await db.nodes.get(node.id)) {
    throw new Error(`A plant with id "${node.id}" already exists.`)
  }
  await importFragment({ nodes: [node] }, { source: MANUAL_SOURCE })
}

/**
 * Overlay hand-edited fields onto an existing node. Only fields that actually changed are
 * written (and stamped `manual`); fields an acquire set keep their provenance. A no-op edit
 * writes nothing.
 */
export async function updateNode(existing: PlantNode, patch: Partial<PlantNode>): Promise<void> {
  const fragment = nodeDiff(existing, patch)
  if (isEmptyDiff(fragment)) return
  await importFragment({ nodes: [fragment] }, { source: MANUAL_SOURCE })
}

/**
 * Delete a node and mark the store user-owned so a demo re-seed can't resurrect it. Children
 * are left untouched (their `parentId` dangles) — the caller should confirm via `childrenOf`
 * first. Not routed through the merge: deletion has no provenance.
 */
export async function deleteNode(id: string): Promise<void> {
  await db.transaction('rw', db.nodes, db.settings, async () => {
    await db.nodes.delete(id)
    await db.settings.put({ key: 'dataSource', value: 'user' })
  })
}

/** A node's direct children — used to warn before a delete would orphan them. */
export async function childrenOf(id: string): Promise<PlantNode[]> {
  return db.nodes.where('parentId').equals(id).toArray()
}
