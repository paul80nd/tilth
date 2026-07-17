// Life-cycle vocabulary + tolerant coercion. A plant's life cycle is multi-valued (schema
// LifecycleCode): behaviour varies with climate/sowing/growing, so a source can assert
// "annual / biennial / perennial" together. Older data (a pre-array backup, hand entry) may
// carry a single string, so read it forgivingly. Pure — no I/O — and unit-tested.

import type { LifecycleCode } from '../schema/plant'

/** Canonical order for display. */
export const LIFECYCLE_CODES: readonly LifecycleCode[] = ['annual', 'biennial', 'perennial']

const LABELS: Record<LifecycleCode, string> = {
  annual: 'Annual',
  biennial: 'Biennial',
  perennial: 'Perennial',
}

export function lifecycleLabel(code: LifecycleCode): string {
  return LABELS[code] ?? code
}

/**
 * Coerce a raw lifecycle value — a code array (current), a bare string (legacy/hand-entered),
 * or junk — into the canonical code array, in display order, de-duplicated. Unknown entries
 * are dropped; returns `undefined` when nothing valid remains so "absent" is preserved (a
 * merge/inherit must be able to tell "not recorded" from "empty").
 */
export function asLifecycle(value: unknown): LifecycleCode[] | undefined {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value]
  const codes = new Set(
    raw
      .map((v) => (typeof v === 'string' ? v.trim().toLowerCase() : ''))
      .filter((v): v is LifecycleCode => (LIFECYCLE_CODES as readonly string[]).includes(v)),
  )
  const ordered = LIFECYCLE_CODES.filter((c) => codes.has(c))
  return ordered.length ? ordered : undefined
}
