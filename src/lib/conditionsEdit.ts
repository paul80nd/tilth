// Pure helpers for the Conditions editor (soil · moisture · pH). These three facets live on the
// shared `conditions` field alongside the Position card's light/aspect/exposure/hardiness — and the
// merge replaces `conditions` as a whole field — so editing Conditions must carry the position
// siblings through untouched. Mirrors positionEdit (the opposite half of the same field).

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

/** Fold a Conditions draft onto a base `Conditions`, preserving the Position facets
 *  (light/aspect/exposure/hardiness) and omitting any empty facet. */
export function applyConditions(base: Conditions | undefined, draft: ConditionsDraft): Conditions {
  const out: Conditions = {}
  if (base?.sun) out.sun = base.sun
  if (base?.aspect) out.aspect = base.aspect
  if (base?.exposure) out.exposure = base.exposure
  if (base?.hardiness) out.hardiness = base.hardiness
  if (draft.soil.length) out.soil = draft.soil
  if (draft.moisture.length) out.moisture = draft.moisture
  if (draft.ph.length) out.ph = draft.ph
  return out
}
