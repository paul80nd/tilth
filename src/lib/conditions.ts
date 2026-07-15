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

// ── Position vocabularies (light / aspect / exposure / hardiness) ────────────────────────────────

export const LIGHT_LEVELS = ['full-sun', 'partial-shade', 'full-shade'] as const
export type LightLevel = (typeof LIGHT_LEVELS)[number]

/** Tolerant light matcher — "partial" wins over "sun"/"shade" so "partial shade" reads as partial. */
export function lightSet(values?: string[]): Set<LightLevel> {
  const out = new Set<LightLevel>()
  for (const v of values ?? []) {
    const s = v.toLowerCase()
    if (s.includes('part') || s.includes('semi')) out.add('partial-shade')
    else if (s.includes('sun')) out.add('full-sun')
    else if (s.includes('shade')) out.add('full-shade')
  }
  return out
}

/** Collapse the tolerated light range to one glyph state: needs sun, tolerates a range, or shade. */
export function lightLevel(set: Set<LightLevel>): 'full' | 'partial' | 'shade' | undefined {
  const full = set.has('full-sun')
  const part = set.has('partial-shade')
  const shade = set.has('full-shade')
  if (full && (part || shade)) return 'partial' // full sun *to* some shade → a tolerant range
  if (full) return 'full'
  if (part) return 'partial'
  if (shade) return 'shade'
  return undefined
}

export const CARDINALS = ['north', 'east', 'south', 'west'] as const
export type Cardinal = (typeof CARDINALS)[number]

export function aspectSet(values?: string[]): Set<Cardinal> {
  const out = new Set<Cardinal>()
  for (const v of values ?? []) {
    const s = v.toLowerCase()
    if (s.includes('north')) out.add('north')
    if (s.includes('east')) out.add('east')
    if (s.includes('south')) out.add('south')
    if (s.includes('west')) out.add('west')
  }
  return out
}

export const EXPOSURE_LEVELS = ['sheltered', 'exposed'] as const
export type Exposure = (typeof EXPOSURE_LEVELS)[number]

export function exposureSet(values?: string[]): Set<Exposure> {
  const out = new Set<Exposure>()
  for (const v of values ?? []) {
    const s = v.toLowerCase()
    if (s.includes('shelter')) out.add('sheltered')
    if (s.includes('expos')) out.add('exposed')
  }
  return out
}

/** Windiness the plant will take: tolerating "exposed" (incl. "any") is the windy end. */
export function exposureLevel(set: Set<Exposure>): 'sheltered' | 'exposed' | undefined {
  if (set.has('exposed')) return 'exposed'
  if (set.has('sheltered')) return 'sheltered'
  return undefined
}

// The generic hardiness scale (H1 tender → H7 very hardy). H1 is sometimes subdivided (H1a/b/c);
// we key the graphic off the leading number and keep the source's exact label for display.
export const HARDINESS_MAX = 7

export function hardiness(rating?: string): { label: string; rank: number } | undefined {
  if (!rating) return undefined
  const m = rating.match(/H\s*([1-7])/i)
  if (!m) return undefined
  return { label: rating.trim().toUpperCase(), rank: Number(m[1]) }
}

/** Human label for a condition token: "well-drained" → "Well drained". */
export function conditionLabel(token: string): string {
  const s = token.replace(/-/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
