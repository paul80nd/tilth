// Pure validation/normalisation for a Save/Open backup snapshot — guards the restore path
// against a malformed or hand-edited file at the door. Dependency-free and side-effect-free
// so it's exhaustively unit-testable; the Dexie wipe-and-restore lives in src/app/backup.ts.
//
// UNLIKE the import parser (src/lib/dataset.ts), this must NOT run nodes through
// `parsePlantDataset`: that one preserves *partiality* and strips `provenance` (the merge
// owns it). A backup holds whole, already-merged records, so we validate lightly and keep
// each record intact — provenance included — dropping only records too broken to restore.

import type { BackupSnapshot, Setting } from '../schema/userData'
import type { PlantNode } from '../schema/plant'
import { splitLegacyConditions } from './positionSplit'

/** Current backup envelope version (what a fresh Save writes). Bump when the snapshot shape
 *  changes. v2 added `beds`. */
export const BACKUP_VERSION = 2

/** Envelope versions the restore path accepts. Older files are read forward — an absent table
 *  (e.g. `beds` in a v1 file) normalises to an empty array. */
const SUPPORTED_VERSIONS = [1, 2]

export interface BackupParseResult {
  /** The validated snapshot, ready to restore. */
  snapshot: BackupSnapshot
  /** Non-fatal issues (e.g. malformed records dropped). */
  warnings: string[]
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Keep whole records that are objects carrying all `required` string keys (non-empty);
 *  count the rest as dropped. Preserves every other field (provenance, nested objects). */
function keepRecords<T>(raw: unknown, required: string[], label: string, warnings: string[]): T[] {
  const arr = Array.isArray(raw) ? raw : []
  const out: T[] = []
  let dropped = 0
  for (const r of arr) {
    if (isObject(r) && required.every((k) => typeof r[k] === 'string' && r[k] !== '')) {
      out.push(r as T)
    } else {
      dropped++
    }
  }
  if (dropped) warnings.push(`${dropped} ${label} record(s) dropped as malformed`)
  return out
}

/**
 * Validate a backup snapshot. Accepts the JSON text or the parsed object. Throws a
 * descriptive Error when the file isn't a recognisable Tilth backup (the UI surfaces it);
 * drops individual malformed records with a warning rather than aborting the whole restore.
 */
export function parseBackup(input: unknown): BackupParseResult {
  let data: unknown = input
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch (err) {
      throw new Error(`not valid JSON: ${(err as Error).message}`)
    }
  }

  if (!isObject(data)) throw new Error('backup is not an object')
  if (typeof data.version !== 'number' || !SUPPORTED_VERSIONS.includes(data.version)) {
    throw new Error(
      `unsupported backup version ${String(data.version)} (expected ${SUPPORTED_VERSIONS.join(' or ')})`,
    )
  }
  // `nodes` is the signature table — its absence means this isn't our backup.
  if (!Array.isArray(data.nodes)) {
    throw new Error('backup has no nodes array — is this a Tilth backup file?')
  }

  const warnings: string[] = []
  // Normalise every accepted version up to the current shape — a v1 file simply has no `beds`.
  const snapshot: BackupSnapshot = {
    version: BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    // Split the legacy combined `conditions` (soil + position) so an old backup restores into the
    // current position/conditions shape. Preserves whole records + provenance otherwise.
    nodes: keepRecords(data.nodes, ['id'], 'node', warnings).map((n) => splitLegacyConditions(n as PlantNode)),
    guides: keepRecords(data.guides, ['id', 'title', 'kind'], 'guide', warnings),
    tasks: keepRecords(data.tasks, ['id', 'action'], 'task', warnings),
    holdings: keepRecords(data.holdings, ['id', 'nodeId', 'status'], 'holding', warnings),
    beds: keepRecords(data.beds, ['id', 'name', 'kind'], 'bed', warnings),
    jobLog: keepRecords(data.jobLog, ['id', 'jobKey', 'date'], 'job-log', warnings),
    settings: keepRecords<Setting>(data.settings, ['key'], 'setting', warnings),
  }

  return { snapshot, warnings }
}
