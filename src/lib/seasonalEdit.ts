// Pure helpers for the seasonal-interest editor: convert between the stored season × part ×
// colour grid and a flat, editable draft (one cell per season/part with an on/off toggle and a
// comma-separated colour string). Kept side-effect-free — the modal drives these, the Dexie
// write goes through the normal `updateNode` merge seam. A part is "on show" for a season when
// it appears in the grid (even with no colour recorded); `off` drops it, so the three display
// states — absent · on-but-uncoloured · on-with-colours — all round-trip.

import type { InterestPart, Season, SeasonalInterest } from '../schema/plant'

/** Seasons in strip order (columns of the grid). */
export const EDIT_SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

/** Parts in editor-row order (foliage · flower · fruit · stem). */
export const EDIT_PARTS: InterestPart[] = ['foliage', 'flower', 'fruit', 'stem']

/** One editable cell: whether the part is on show that season, and its colours as free text. */
export interface CellDraft {
  on: boolean
  /** Comma-separated colour words, exactly as typed (parsed only on save/preview). */
  colours: string
}

export type InterestDraft = Record<Season, Record<InterestPart, CellDraft>>

/** Split a comma/line-separated colour string into trimmed, de-duplicated words (order kept). */
export function parseColours(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/[,\n]/)) {
    const word = raw.trim()
    if (word && !seen.has(word.toLowerCase())) {
      seen.add(word.toLowerCase())
      out.push(word)
    }
  }
  return out
}

/** Build an editable draft from a (resolved) grid — a full 4×4 of cells so every slot renders. */
export function toDraft(interest: SeasonalInterest | undefined): InterestDraft {
  const draft = {} as InterestDraft
  for (const season of EDIT_SEASONS) {
    const bucket = interest?.[season]
    draft[season] = {} as Record<InterestPart, CellDraft>
    for (const part of EDIT_PARTS) {
      const colours = bucket?.[part]
      draft[season][part] = { on: colours !== undefined, colours: (colours ?? []).join(', ') }
    }
  }
  return draft
}

/** Collapse a draft back to a minimal grid: only on-parts, and only seasons that have any. */
export function fromDraft(draft: InterestDraft): SeasonalInterest {
  const out: SeasonalInterest = {}
  for (const season of EDIT_SEASONS) {
    const parts: Partial<Record<InterestPart, string[]>> = {}
    for (const part of EDIT_PARTS) {
      const cell = draft[season][part]
      if (cell.on) parts[part] = parseColours(cell.colours)
    }
    if (Object.keys(parts).length > 0) out[season] = parts
  }
  return out
}
