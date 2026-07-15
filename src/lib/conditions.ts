// Canonical growing-condition vocabularies + tolerant matchers. The schema stores soil / ph /
// moisture as free token arrays (source-neutral); the cheatsheet needs to know which of each
// small fixed set a plant tolerates, so it can render a scannable glyph (a filled region = "grows
// in this", a muted region = "not this / unknown"). Matchers lowercase + keyword-match so messy
// import strings ("Moist but well-drained", "Loam / Clay", "Chalky") still resolve. Pure — no I/O.

export const SOIL_TYPES = ['chalk', 'clay', 'loam', 'sand'] as const
export type SoilType = (typeof SOIL_TYPES)[number]

export const PH_LEVELS = ['acid', 'neutral', 'alkaline'] as const
export type PhLevel = (typeof PH_LEVELS)[number]

// A drainage / retention scale, driest → wettest.
export const MOISTURE_LEVELS = ['well-drained', 'moist', 'poorly-drained'] as const
export type MoistureLevel = (typeof MOISTURE_LEVELS)[number]

export function soilSet(values?: string[]): Set<SoilType> {
  const out = new Set<SoilType>()
  for (const v of values ?? []) {
    const s = v.toLowerCase()
    if (s.includes('chalk')) out.add('chalk')
    if (s.includes('clay')) out.add('clay')
    if (s.includes('loam')) out.add('loam')
    if (s.includes('sand')) out.add('sand')
  }
  return out
}

export function phSet(values?: string[]): Set<PhLevel> {
  const out = new Set<PhLevel>()
  for (const v of values ?? []) {
    const s = v.toLowerCase()
    if (s.includes('acid')) out.add('acid')
    if (s.includes('neutral')) out.add('neutral')
    if (s.includes('alkal')) out.add('alkaline')
  }
  return out
}

export function moistureSet(values?: string[]): Set<MoistureLevel> {
  const out = new Set<MoistureLevel>()
  for (const v of values ?? []) {
    const s = v.toLowerCase()
    const poorly = s.includes('poor') || s.includes('wet') || s.includes('bog')
    if (poorly) out.add('poorly-drained')
    if (s.includes('moist') || s.includes('damp')) out.add('moist')
    // "well-drained" / "free-draining" — but not the "poorly-drained" sense, which also matches "drain".
    if (!poorly && (s.includes('well') || s.includes('free') || s.includes('drain'))) {
      out.add('well-drained')
    }
  }
  return out
}

/** Human label for a condition token: "well-drained" → "Well drained". */
export function conditionLabel(token: string): string {
  const s = token.replace(/-/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
