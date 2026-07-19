// Pure helpers for the Conditions editor (soil · moisture · pH) — the `conditions` field, a sibling
// of `position` (light/aspect/exposure/hardiness). `toConditionsDraft` normalises stored values to
// the canonical vocab; `applyConditions` folds a draft back into a `Conditions`, dropping empties.
// Mirrors positionEdit.

import type { Conditions } from '../schema/plant'
import {
  MOISTURE_LEVELS,
  PH_LEVELS,
  SOIL_TYPES,
  moistureSet,
  phSet,
  soilSet,
  type MoistureLevel,
  type PhLevel,
  type SoilType,
} from './conditions'

export interface ConditionsDraft {
  soil: SoilType[]
  moisture: MoistureLevel[]
  ph: PhLevel[]
}

/** Read a node's conditions into an editable draft — canonical order, tolerant of free-text input
 *  ("Chalky" → 'chalk'), so the dirty check compares stable, normalised values. */
export function toConditionsDraft(conditions: Conditions | undefined): ConditionsDraft {
  const soil = soilSet(conditions?.soil)
  const moisture = moistureSet(conditions?.moisture)
  const ph = phSet(conditions?.ph)
  return {
    soil: SOIL_TYPES.filter((t) => soil.has(t)),
    moisture: MOISTURE_LEVELS.filter((m) => moisture.has(m)),
    ph: PH_LEVELS.filter((p) => ph.has(p)),
  }
}

/** Fold a Conditions draft into a `Conditions`, omitting any empty facet (an all-empty draft
 *  yields `{}`, which the caller drops so the card re-inherits). */
export function applyConditions(draft: ConditionsDraft): Conditions {
  const out: Conditions = {}
  if (draft.soil.length) out.soil = draft.soil
  if (draft.moisture.length) out.moisture = draft.moisture
  if (draft.ph.length) out.ph = draft.ph
  return out
}
