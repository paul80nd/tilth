// Pure validation/normalisation for an importable plant dataset *fragment*. A private
// adapter emits a `PlantDataset` already in our schema; this guards the SPA against a
// malformed or partial file at the door — drop unusable records, pass the rest through,
// never throw. Dependency-free and side-effect-free so it's exhaustively unit-testable;
// the Dexie write + merge live in the app layer (see src/app/dataset.ts).
//
// UNLIKE Forkast's parser, this one MUST preserve partiality: a fragment carries only
// *some* fields and absence is meaningful (absent ⇒ leave the existing value alone at
// merge time). So we never inject defaults on a node — we copy through only the fields
// actually present, trimming strings. Filling `category: ''` here would silently clobber a
// value a previous import set. See docs/decisions.md → "Property-level merge imports".

import type {
  PlantNode,
  Guide,
  TaskTemplate,
  PlantDataset,
} from '../schema/plant'

/** A node fragment: an id plus whichever fields this import supplies. */
export type NodeFragment = Partial<PlantNode> & { id: string }

export interface ParsedFragment {
  /** The fragment's whole-file source key, if the wrapper declared one. */
  source?: string
  /** Partial node overlays, ready to merge. */
  nodes: NodeFragment[]
  /** Whole-record guides (linked by default). */
  guides: Guide[]
  /** Whole-record job templates. */
  tasks: TaskTemplate[]
  /** Human-readable reason per dropped record. */
  errors: string[]
  /** Count of records dropped (== errors.length). */
  skipped: number
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Trim imported strings and treat whitespace-only as absent — source data often carries
// stray spaces that otherwise sort/display wrong.
function asString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t === '' ? undefined : t
}

// The known top-level PlantNode fields a fragment may carry, minus the structural `id`
// (handled separately) and the output-only `provenance` (the merge stamps it, never the
// fragment). Present ⇒ copied through verbatim; absent ⇒ omitted so merge leaves it alone.
const NODE_FIELDS: Array<keyof PlantNode> = [
  'rank',
  'parentId',
  'category',
  'commonName',
  'variety',
  'botanicalName',
  'family',
  'genus',
  'lifecycle',
  'foliage',
  'habit',
  'calendar',
  'conditions',
  'size',
  'facts',
  'awards',
  'summary',
  'image',
]

/** Copy through the present node fields, trimming strings; preserve absence. */
function normaliseNode(raw: unknown, index: number): NodeFragment | string {
  if (!isObject(raw)) return `node #${index + 1}: not an object`
  const id = asString(raw.id)
  if (!id) return `node #${index + 1}: missing id`

  const node: NodeFragment = { id }
  for (const key of NODE_FIELDS) {
    const value = raw[key]
    if (value === undefined || value === null) continue
    // Trim scalar strings; arrays/objects (calendar, conditions, size, facts) pass through
    // as whole fields — the merge replaces them wholesale, so we don't reshape them here.
    if (typeof value === 'string') {
      const s = asString(value)
      if (s !== undefined) (node as Record<string, unknown>)[key] = s
    } else {
      ;(node as Record<string, unknown>)[key] = value
    }
  }
  return node
}

function normaliseGuide(raw: unknown, index: number): Guide | string {
  if (!isObject(raw)) return `guide #${index + 1}: not an object`
  const id = asString(raw.id)
  if (!id) return `guide #${index + 1}: missing id`
  const title = asString(raw.title)
  if (!title) return `guide "${id}": missing title`
  const guide: Guide = { id, title, kind: (asString(raw.kind) as Guide['kind']) ?? 'general' }
  const url = asString(raw.url)
  if (url) guide.url = url
  const scopeNodeId = asString(raw.scopeNodeId)
  if (scopeNodeId) guide.scopeNodeId = scopeNodeId
  const scopeCategory = asString(raw.scopeCategory)
  if (scopeCategory) guide.scopeCategory = scopeCategory as Guide['scopeCategory']
  const content = asString(raw.content)
  if (content) guide.content = content
  return guide
}

function normaliseTask(raw: unknown, index: number): TaskTemplate | string {
  if (!isObject(raw)) return `task #${index + 1}: not an object`
  const id = asString(raw.id)
  if (!id) return `task #${index + 1}: missing id`
  const action = asString(raw.action)
  if (!action) return `task "${id}": missing action`
  const months = Array.isArray(raw.months)
    ? raw.months.filter((m): m is number => typeof m === 'number' && m >= 1 && m <= 12)
    : []
  const task: TaskTemplate = { id, action, months }
  const scopeNodeId = asString(raw.scopeNodeId)
  if (scopeNodeId) task.scopeNodeId = scopeNodeId
  const scopeCategory = asString(raw.scopeCategory)
  if (scopeCategory) task.scopeCategory = scopeCategory as TaskTemplate['scopeCategory']
  const note = asString(raw.note)
  if (note) task.note = note
  return task
}

/** Drop-with-reason wrapper: normalise a list, dedupe ids (first wins), collect errors. */
function collect<T extends { id: string }>(
  raws: unknown[],
  normalise: (raw: unknown, i: number) => T | string,
  errors: string[],
): T[] {
  const out: T[] = []
  const seen = new Set<string>()
  raws.forEach((raw, i) => {
    const res = normalise(raw, i)
    if (typeof res === 'string') {
      errors.push(res)
      return
    }
    if (seen.has(res.id)) {
      errors.push(`${res.id}: duplicate id`)
      return
    }
    seen.add(res.id)
    out.push(res)
  })
  return out
}

/**
 * Validate and normalise an importable fragment. Accepts the JSON text, the parsed
 * `{ version, nodes, guides, tasks }` wrapper, or a bare array of nodes. Invalid records
 * are dropped with a reason rather than aborting the whole import.
 */
export function parsePlantDataset(input: unknown): ParsedFragment {
  let data: unknown = input
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch (err) {
      return { nodes: [], guides: [], tasks: [], errors: [`not valid JSON: ${(err as Error).message}`], skipped: 1 }
    }
  }

  let rawNodes: unknown[] = []
  let rawGuides: unknown[] = []
  let rawTasks: unknown[] = []
  let source: string | undefined

  if (Array.isArray(data)) {
    rawNodes = data
  } else if (isObject(data)) {
    source = asString(data.source)
    if (Array.isArray(data.nodes)) rawNodes = data.nodes
    if (Array.isArray(data.guides)) rawGuides = data.guides
    if (Array.isArray(data.tasks)) rawTasks = data.tasks
    if (!data.nodes && !data.guides && !data.tasks) {
      return { nodes: [], guides: [], tasks: [], errors: ['dataset has no nodes/guides/tasks'], skipped: 1 }
    }
  } else {
    return { nodes: [], guides: [], tasks: [], errors: ['dataset is not an object or array'], skipped: 1 }
  }

  const errors: string[] = []
  const nodes = collect(rawNodes, normaliseNode, errors)
  const guides = collect(rawGuides, normaliseGuide, errors)
  const tasks = collect(rawTasks, normaliseTask, errors)

  return { source, nodes, guides, tasks, errors, skipped: errors.length }
}

/** Narrow a parsed wrapper to a typed dataset, for callers that need the envelope. */
export function isPlantDataset(v: unknown): v is PlantDataset {
  return isObject(v) && v.version === 1
}
