// Pure helpers for the Position editor (light · aspect · exposure · hardiness) — the `position`
// field, a sibling of `conditions` (soil). `toPositionDraft` normalises the stored (possibly
// free-text) values to the canonical vocab for the toggle controls; `applyPosition` folds a draft
// back into a `Position`, dropping empties. Side-effect-free; the Dexie write goes through
// `updateNode` (which replaces the field, so a dropped facet is removed).

import type { Position } from '../schema/plant'
import {
  CARDINALS,
  EXPOSURE_LEVELS,
  LIGHT_LEVELS,
  aspectSet,
  exposureSet,
  hardiness,
  lightSet,
  type Cardinal,
  type Exposure,
  type LightLevel,
} from './conditions'

export interface PositionDraft {
  sun: LightLevel[]
  aspect: Cardinal[]
  exposure: Exposure[]
  /** Exact hardiness label (e.g. "H5"); '' = none. Kept as the source's string. */
  hardiness: string
}

/** Read a node's position into an editable draft — canonical order, tolerant of free-text input
 *  ("Full sun" → 'full-sun'), so the dirty check compares stable, normalised values. */
export function toPositionDraft(position: Position | undefined): PositionDraft {
  const sun = lightSet(position?.sun)
  const aspect = aspectSet(position?.aspect)
  const exposure = exposureSet(position?.exposure)
  return {
    sun: LIGHT_LEVELS.filter((l) => sun.has(l)),
    aspect: CARDINALS.filter((c) => aspect.has(c)),
    exposure: EXPOSURE_LEVELS.filter((e) => exposure.has(e)),
    // Normalise to the canonical label (e.g. "H1C" → "H1c") so it matches the toggle vocab; keep
    // any unrecognised free-text as-is rather than dropping it.
    hardiness: hardiness(position?.hardiness)?.label ?? position?.hardiness?.trim() ?? '',
  }
}

/** Fold a Position draft into a `Position`, omitting any empty facet so the stored object stays
 *  minimal (an all-empty draft yields `{}`, which the caller drops so the card re-inherits). */
export function applyPosition(draft: PositionDraft): Position {
  const out: Position = {}
  if (draft.sun.length) out.sun = draft.sun
  if (draft.aspect.length) out.aspect = draft.aspect
  if (draft.exposure.length) out.exposure = draft.exposure
  if (draft.hardiness.trim()) out.hardiness = draft.hardiness.trim()
  return out
}
