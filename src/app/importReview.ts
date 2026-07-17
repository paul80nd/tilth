// Application layer for the diff-review import. `buildReview` reads the current store and
// produces a per-node/-field diff for the UI to render; `applyReview` narrows the fragment to
// the fields the gardener kept ticked and hands it to the existing `importFragment` seam (so
// the property-level merge, provenance stamping and user-owned mark are all reused unchanged).
// The Gherkin steps drive these directly, below React.

import { db } from '../db/db'
import { parsePlantDataset, type NodeFragment, type ParsedFragment } from '../lib/dataset'
import { diffNode, selectFragment, type NodeDiff } from '../lib/importDiff'
import { importFragment, type ImportResult } from './dataset'

/** A whole-record guide/task in the fragment (upserted, not field-diffed) + whether it's new. */
export interface RecordDiff {
  id: string
  label: string
  isNew: boolean
}

export interface ImportReview {
  source?: string
  nodes: NodeDiff[]
  guides: RecordDiff[]
  tasks: RecordDiff[]
  errors: string[]
  skipped: number
  /** The parsed fragment, kept so `applyReview` can rebuild a filtered dataset from a selection. */
  parsed: ParsedFragment
}

/** Parse an incoming fragment and diff every node/guide/task against what's already stored. */
export async function buildReview(input: unknown): Promise<ImportReview> {
  const parsed = parsePlantDataset(input)

  const nodes: NodeDiff[] = []
  for (const fragment of parsed.nodes) {
    nodes.push(diffNode(await db.nodes.get(fragment.id), fragment))
  }
  const guides: RecordDiff[] = []
  for (const g of parsed.guides) {
    guides.push({ id: g.id, label: g.title, isNew: !(await db.guides.get(g.id)) })
  }
  const tasks: RecordDiff[] = []
  for (const t of parsed.tasks) {
    tasks.push({ id: t.id, label: t.action, isNew: !(await db.tasks.get(t.id)) })
  }

  return { source: parsed.source, nodes, guides, tasks, errors: parsed.errors, skipped: parsed.skipped, parsed }
}

/** What the gardener kept ticked: fields per node (a node absent/empty is skipped), and the
 *  guide/task ids to upsert. */
export interface ReviewSelection {
  nodeFields: Record<string, string[]>
  guideIds: string[]
  taskIds: string[]
}

/**
 * Apply only the ticked parts. Each node is narrowed to `id` + its ticked fields via
 * `selectFragment` (so unticked fields are simply absent and the merge leaves them alone);
 * guides/tasks are filtered by id. The result goes through the normal import seam.
 */
export async function applyReview(review: ImportReview, selection: ReviewSelection): Promise<ImportResult> {
  const nodes: NodeFragment[] = []
  for (const fragment of review.parsed.nodes) {
    const fields = selection.nodeFields[fragment.id]
    if (!fields || fields.length === 0) continue
    nodes.push(selectFragment(fragment, fields))
  }
  const guides = review.parsed.guides.filter((g) => selection.guideIds.includes(g.id))
  const tasks = review.parsed.tasks.filter((t) => selection.taskIds.includes(t.id))

  return importFragment({ version: 1, source: review.source, nodes, guides, tasks }, { source: review.source })
}
