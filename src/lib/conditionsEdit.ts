// Pure helpers for the Conditions editor (soil · moisture · pH). These three facets live on the
// shared `conditions` field alongside the Position card's light/aspect/exposure/hardiness — and the
// edit path merges with `objects: 'replace'` (so dropping a facet removes it) — so editing
// Conditions must carry the position siblings through untouched. Mirrors positionEdit (the opposite
// half of the same field).

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

/** Drop the Conditions facets (soil/moisture/ph) from a node's own conditions, keeping the
 *  Position half (light/aspect/exposure/hardiness). Used when clearing the Conditions card: the
 *  result is written back (or, when empty, the whole `conditions` field is removed so Conditions
 *  inherits from a parent again). */
export function withoutConditions(conditions: Conditions | undefined): Conditions {
  const out: Conditions = {}
  if (conditions?.sun) out.sun = conditions.sun
  if (conditions?.aspect) out.aspect = conditions.aspect
  if (conditions?.exposure) out.exposure = conditions.exposure
  if (conditions?.hardiness) out.hardiness = conditions.hardiness
  return out
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
