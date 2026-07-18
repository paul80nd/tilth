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
import type { FieldSource, PlantNode } from '../schema/plant'

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
  // `replace`: the editor submits the whole object for a field, so omitting a facet (soil,
  // hardiness, …) must remove it — deep-merge would leave the dropped facet behind.
  await importFragment({ nodes: [node] }, { source: MANUAL_SOURCE, objects: 'replace' })
}

/**
 * Overlay hand-edited fields onto an existing node. Only fields that actually changed are
 * written (and stamped `manual`); fields an acquire set keep their provenance. A no-op edit
 * writes nothing.
 */
export async function updateNode(existing: PlantNode, patch: Partial<PlantNode>): Promise<void> {
  const fragment = nodeDiff(existing, patch)
  if (isEmptyDiff(fragment)) return
  // `replace` (see createNode): a hand edit is authoritative for the fields it touches, so the
  // whole object it submits replaces — otherwise removing a facet by omission wouldn't stick.
  await importFragment({ nodes: [fragment] }, { source: MANUAL_SOURCE, objects: 'replace' })
}

/**
 * Clear a node's OWN value for a field so that card inherits it from an ancestor again (or falls
 * back to the empty placeholder when no ancestor has it). The merge only ever overlays present
 * fields (absent = leave alone), so a field can't be removed through `importFragment` — this writes
 * the store directly, dropping the field and its provenance, and marks the store user-owned.
 *
 * `replacement` covers the shared `conditions` field: clearing one half (Position or Conditions)
 * keeps the other, so the caller passes the reduced object — an empty or undefined replacement
 * removes the field outright, which is what the single-field cards (calendar/size/…) always want.
 */
export async function clearNodeField(id: string, field: keyof PlantNode, replacement?: unknown): Promise<void> {
  const keep =
    replacement !== undefined &&
    !(typeof replacement === 'object' && replacement !== null && Object.keys(replacement).length === 0)
  await db.transaction('rw', db.nodes, db.settings, async () => {
    const node = await db.nodes.get(id)
    if (!node) return
    const provenance: Record<string, FieldSource> = { ...(node.provenance ?? {}) }
    const bag = node as unknown as Record<string, unknown>
    if (keep) {
      bag[field] = replacement
      provenance[field] = { source: MANUAL_SOURCE }
    } else {
      delete bag[field]
      delete provenance[field]
    }
    node.provenance = provenance
    await db.nodes.put(node)
    await db.settings.put({ key: 'dataSource', value: 'user' })
  })
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
