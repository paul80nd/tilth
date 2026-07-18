// Pure helpers for the "More facts" editor. `facts` is a free key/value bag of display chips
// (e.g. "spacing" → "20cm"); the draft is an ordered list of rows so the editor can add, edit and
// remove pairs. Collapsing drops rows with a blank key and trims both sides — a row with a blank
// key is treated as not-yet-filled. An all-blank draft collapses to {}, which the card renders as
// empty (and the editor's Clear removes the field so it re-inherits). Mirrors the plant-form's
// facts handling. Side-effect-free; the Dexie write goes through `updateNode` (which replaces the
// whole object, so a removed row removes its key).

export interface FactRow {
  key: string
  value: string
}

/** Read a node's facts into ordered editable rows. */
export function toFactsDraft(facts: Record<string, string> | undefined): FactRow[] {
  return Object.entries(facts ?? {}).map(([key, value]) => ({ key, value }))
}

/** Collapse rows back to a facts map: keys trimmed (blank keys dropped), values trimmed. A later
 *  row with the same key wins. */
export function fromFactsDraft(rows: FactRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const { key, value } of rows) {
    const k = key.trim()
    if (k) out[k] = value.trim()
  }
  return out
}
