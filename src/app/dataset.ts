// Application layer: the merge-import use-case. This is the seam the UI and the Gherkin
// feature tests both drive — pages stay thin shells over these calls, and the steps
// exercise the real Dexie code paths (against fake-indexeddb) here, just below React.
//
// Tilth's import DIVERGES from Forkast's whole-record `bulkPut`: reference nodes are
// assembled from several sources over time, so each imported node is a *partial overlay*
// applied via `mergeNode` (present ⇒ overwrite, absent ⇒ keep, per-field provenance).
// Guides and tasks are whole records (linked content, single provenance) — upserted by id.
// Pure shaping/validation lives in src/lib/dataset.ts.

import { db } from '../db/db'
import { parsePlantDataset } from '../lib/dataset'
import { mergeNode, type MergeMeta } from '../lib/merge'
import type { FieldSource } from '../schema/plant'

export interface ImportResult {
  /** Node fragments merged in. */
  nodes: number
  /** Guides upserted. */
  guides: number
  /** Task templates upserted. */
  tasks: number
  /** Records dropped as unusable. */
  skipped: number
  /** Reason per dropped record. */
  errors: string[]
}

/**
 * Apply a parsed fragment to the reference stores in one transaction. Shared by the
 * user-facing import (`importFragment`, marks the store user-owned) and the first-run demo
 * seed (marks it demo). `markUser` is what protects a real import from the demo re-seed.
 */
export async function importFragment(
  input: unknown,
  meta: Partial<MergeMeta> = {},
  markUser = true,
): Promise<ImportResult> {
  const parsed = parsePlantDataset(input)

  // Whole-fragment provenance: an explicit meta.source wins, else the wrapper's `source`,
  // else a neutral fallback. importedAt defaults to now so provenance is answerable.
  const stamp: MergeMeta = {
    source: meta.source ?? parsed.source ?? 'import',
    importedAt: meta.importedAt ?? new Date().toISOString(),
  }
  if (meta.url) stamp.url = meta.url
  const guideStamp: FieldSource = { source: stamp.source, importedAt: stamp.importedAt }
  if (stamp.url) guideStamp.url = stamp.url

  await db.transaction('rw', db.nodes, db.guides, db.tasks, db.settings, async () => {
    for (const fragment of parsed.nodes) {
      const existing = await db.nodes.get(fragment.id)
      await db.nodes.put(mergeNode(existing, fragment, stamp))
    }
    for (const guide of parsed.guides) {
      await db.guides.put({ ...guide, provenance: guideStamp })
    }
    for (const task of parsed.tasks) {
      await db.tasks.put({ ...task, provenance: guideStamp })
    }
    if (markUser) await db.settings.put({ key: 'dataSource', value: 'user' })
  })

  return {
    nodes: parsed.nodes.length,
    guides: parsed.guides.length,
    tasks: parsed.tasks.length,
    skipped: parsed.skipped,
    errors: parsed.errors,
  }
}
