// Pure helpers for the calendar editor: convert between the stored 12-month phase chart
// (`PhaseSpan[]` — one span per phase over a set of months, with an optional note) and a flat,
// editable draft (one row per phase code with a 12-slot month toggle and a free note). Kept
// side-effect-free — the modal drives these, the Dexie write goes through the normal `updateNode`
// merge seam. Every phase code gets a row so a phase not yet present can be added; a row with no
// months selected drops out on save. Multiple stored spans of the same code are folded into one
// row (their months unioned, the first note kept) — the calendar is a whole-field replace, so this
// round-trips cleanly.

import type { PhaseCode, PhaseSpan } from '../schema/plant'
import { PHASE_ORDER } from './calendar'

/** One editable row: which months (index 0 = January … 11 = December) the phase is active, and
 *  its note as free text. */
export interface PhaseDraftRow {
  months: boolean[]
  note: string
}

export type CalendarDraft = Record<PhaseCode, PhaseDraftRow>

/** Build an editable draft from a (resolved) calendar — a full row per phase code so every phase
 *  can be toggled on. Months from every span of a code are unioned; the first note is kept. */
export function toCalendarDraft(calendar: PhaseSpan[] | undefined): CalendarDraft {
  const draft = {} as CalendarDraft
  for (const code of PHASE_ORDER) {
    const spans = (calendar ?? []).filter((s) => s.code === code)
    const months = Array.from({ length: 12 }, (_, i) => spans.some((s) => s.months.includes(i + 1)))
    const note = spans.find((s) => s.note?.trim())?.note?.trim() ?? ''
    draft[code] = { months, note }
  }
  return draft
}

/** Collapse a draft back to a minimal calendar: one span per code that has any month selected,
 *  in PHASE_ORDER, carrying its note only when non-empty. */
export function fromCalendarDraft(draft: CalendarDraft): PhaseSpan[] {
  const out: PhaseSpan[] = []
  for (const code of PHASE_ORDER) {
    const row = draft[code]
    const months = row.months.flatMap((on, i) => (on ? [i + 1] : []))
    if (months.length === 0) continue
    const span: PhaseSpan = { code, months }
    const note = row.note.trim()
    if (note) span.note = note
    out.push(span)
  }
  return out
}
