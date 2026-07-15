// Pure helpers for hand-authoring plant nodes (the add/edit form). The important bit is
// `nodeDiff`: an edit must overlay ONLY the fields the gardener actually changed, so a field
// an acquire previously set (e.g. from a horticultural database) keeps its provenance rather
// than being re-stamped "manual" just because the form re-submitted it unchanged. Kept pure
// and side-effect-free; the Dexie write + merge live in src/app/editNode.ts.

import type { NodeFragment } from './dataset'
import type { PlantNode } from '../schema/plant'

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Structural/value-equality over the plain-JSON shapes a node carries (scalars, string
 *  arrays, {source,url,label} arrays, the facts map). Key order is ignored for objects. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]))
  }
  if (isObj(a) && isObj(b)) {
    const ak = Object.keys(a)
    const bk = Object.keys(b)
    return ak.length === bk.length && ak.every((k) => k in b && deepEqual(a[k], b[k]))
  }
  return false
}

/**
 * A merge fragment carrying only the fields of `patch` that differ from `existing`. `id` is
 * always present; `provenance` is never diffed (the merge owns it). A patch key absent (or
 * undefined) means "not edited" — it is not compared, so the existing value is left alone.
 */
export function nodeDiff(existing: PlantNode, patch: Partial<PlantNode>): NodeFragment {
  const out: NodeFragment = { id: existing.id }
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'id' || key === 'provenance' || value === undefined) continue
    if (!deepEqual(value, (existing as unknown as Record<string, unknown>)[key])) {
      ;(out as Record<string, unknown>)[key] = value
    }
  }
  return out
}

/** True when a diff carries no real change (just the id) — the caller can skip the write. */
export function isEmptyDiff(fragment: NodeFragment): boolean {
  return Object.keys(fragment).length <= 1
}

/** Slug of an arbitrary string: lower-case, punctuation dropped, runs of non-alphanumerics
 *  collapsed to a single hyphen. Matches the shape of the demo ids ("apple-orchard-gold"). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** A node needs at least a common or botanical name — otherwise it's unfindable and `suggestId`
 *  falls back to the generic "plant" id. The add form gates on this so a nameless node (only a
 *  family/category typed, say) can't be created. */
export function hasIdentity(node: Partial<PlantNode>): boolean {
  return !!(node.commonName?.trim() || node.botanicalName?.trim())
}

/** A suggested stable id for a new node from its identity — botanical name (preferred) or
 *  common name, plus any variety. Falls back to "plant" so the id is never empty. */
export function suggestId(node: Partial<PlantNode>): string {
  const base = node.botanicalName ?? node.commonName ?? 'plant'
  const parts = [base, node.variety].filter((s): s is string => !!s && s.trim() !== '')
  return slugify(parts.join(' ')) || 'plant'
}
