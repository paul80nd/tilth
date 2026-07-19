// Pure helpers for the Position editor (light · aspect · exposure · hardiness). These four facets
// live on the shared `conditions` field alongside the Conditions card's soil/moisture/ph — and the
// edit path merges with `objects: 'replace'` (so dropping a facet removes it) — so editing Position
// must carry the sibling soil/moisture/ph through untouched. `toPositionDraft` normalises the stored (possibly free-text)
// values to the canonical vocab for the toggle controls; `applyPosition` folds a draft back onto a
// base `Conditions`, dropping empties. Side-effect-free; the Dexie write goes through `updateNode`.

import type { Conditions } from '../schema/plant'
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

/** Read a node's conditions into an editable draft — canonical order, tolerant of free-text input
 *  ("Full sun" → 'full-sun'), so the dirty check compares stable, normalised values. */
export function toPositionDraft(conditions: Conditions | undefined): PositionDraft {
  const sun = lightSet(conditions?.sun)
  const aspect = aspectSet(conditions?.aspect)
  const exposure = exposureSet(conditions?.exposure)
  return {
    sun: LIGHT_LEVELS.filter((l) => sun.has(l)),
    aspect: CARDINALS.filter((c) => aspect.has(c)),
    exposure: EXPOSURE_LEVELS.filter((e) => exposure.has(e)),
    // Normalise to the canonical label (e.g. "H1C" → "H1c") so it matches the toggle vocab; keep
    // any unrecognised free-text as-is rather than dropping it.
    hardiness: hardiness(conditions?.hardiness)?.label ?? conditions?.hardiness?.trim() ?? '',
  }
}

/** Drop the Position facets (light/aspect/exposure/hardiness) from a node's own conditions,
 *  keeping the Conditions half (soil/moisture/ph). Used when clearing the Position card: the
 *  result is written back (or, when empty, the whole `conditions` field is removed so Position
 *  inherits from a parent again). */
export function withoutPosition(conditions: Conditions | undefined): Conditions {
  const out: Conditions = {}
  if (conditions?.soil) out.soil = conditions.soil
  if (conditions?.moisture) out.moisture = conditions.moisture
  if (conditions?.ph) out.ph = conditions.ph
  return out
}

/** Fold a Position draft onto a base `Conditions`, preserving soil/moisture/ph and omitting any
 *  empty facet so the stored object stays minimal. */
export function applyPosition(base: Conditions | undefined, draft: PositionDraft): Conditions {
  const out: Conditions = {}
  if (base?.soil) out.soil = base.soil
  if (base?.moisture) out.moisture = base.moisture
  if (base?.ph) out.ph = base.ph
  if (draft.sun.length) out.sun = draft.sun
  if (draft.aspect.length) out.aspect = draft.aspect
  if (draft.exposure.length) out.exposure = draft.exposure
  if (draft.hardiness.trim()) out.hardiness = draft.hardiness.trim()
  return out
}
