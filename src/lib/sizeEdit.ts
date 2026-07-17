// Pure helpers for the Size editor. Size is three free-form strings (height · spread · time to
// ultimate size) kept verbatim as labels — the geometry is parsed elsewhere (lib/size). The editor
// just trims and drops blanks. Side-effect-free; the Dexie write goes through `updateNode`.

import type { Size } from '../schema/plant'

export interface SizeDraft {
  height: string
  spread: string
  timeToSize: string
}

/** Read a node's size into an editable draft (blank strings for absent fields). */
export function toSizeDraft(size: Size | undefined): SizeDraft {
  return {
    height: size?.height ?? '',
    spread: size?.spread ?? '',
    timeToSize: size?.timeToSize ?? '',
  }
}

/** Collapse a draft back to a Size, trimming and omitting blank fields. */
export function fromSizeDraft(draft: SizeDraft): Size {
  const out: Size = {}
  const height = draft.height.trim()
  const spread = draft.spread.trim()
  const timeToSize = draft.timeToSize.trim()
  if (height) out.height = height
  if (spread) out.spread = spread
  if (timeToSize) out.timeToSize = timeToSize
  return out
}
