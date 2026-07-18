// Pure helpers for the Edibility editor. The card covers two independent node fields — `edible`
// (a free list of parts, e.g. "fruit, leaves") and `toxicity` (a free caution note) — so the draft
// is two strings: edible as a comma-separated list, toxicity verbatim. Both keys are always present
// in the patch, so emptying a field and saving overrides it to blank (the card then hides it),
// matching the Size editor; the editor's Clear removes both own fields so the card re-inherits.
// Side-effect-free; the Dexie write goes through `updateNode`.

export interface EdibilityDraft {
  edible: string
  toxicity: string
}

/** Read a node's edibility into an editable draft (comma-joined parts; blank when absent). */
export function toEdibilityDraft(edible: string[] | undefined, toxicity: string | undefined): EdibilityDraft {
  return {
    edible: (edible ?? []).join(', '),
    toxicity: toxicity ?? '',
  }
}

/** Collapse a draft to the `edible`/`toxicity` patch: parts split on commas (trimmed, blanks
 *  dropped), toxicity trimmed. Both keys are present so an emptied field overrides to blank. */
export function fromEdibilityDraft(draft: EdibilityDraft): { edible: string[]; toxicity: string } {
  return {
    edible: draft.edible.split(',').map((s) => s.trim()).filter(Boolean),
    toxicity: draft.toxicity.trim(),
  }
}
