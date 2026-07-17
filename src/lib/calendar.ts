// Pure calendar helpers. The 12-month chart and the (later) jobs engine both read phase
// metadata from here: each PhaseCode's label and the token the UI colours it with. Every
// PhaseCode is ACTIONABLE (a job — sow, prune, harvest…); ornamental interest is the separate
// `seasonalInterest` grid, resolved lower down. Colour lives in CSS (--tl-phase-*); this only
// names the token class, never a hex.

import type { InterestPart, PhaseCode, PhaseSpan, Season, SeasonalInterest } from '../schema/plant'

export interface PhaseMeta {
  label: string
  /** Tailwind colour utility suffix — `bg-phase-${token}` / `text-phase-${token}`. */
  token: string
}

/** Ordered so the calendar's phase rows read roughly in the order you'd do them. */
export const PHASE_ORDER: PhaseCode[] = [
  'sow-indoors',
  'sow-outdoors',
  'pot-on',
  'plant-out',
  'thin',
  'prune',
  'divide',
  'feed',
  'harvest',
]

export const PHASE_META: Record<PhaseCode, PhaseMeta> = {
  'sow-indoors': { label: 'Sow indoors', token: 'sow-indoors' },
  'sow-outdoors': { label: 'Sow outdoors', token: 'sow-outdoors' },
  'pot-on': { label: 'Pot on', token: 'pot-on' },
  'plant-out': { label: 'Plant out', token: 'plant-out' },
  thin: { label: 'Thin', token: 'thin' },
  prune: { label: 'Prune', token: 'prune' },
  divide: { label: 'Divide', token: 'divide' },
  feed: { label: 'Feed', token: 'feed' },
  harvest: { label: 'Harvest', token: 'harvest' },
}

export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** The distinct phase codes present in a calendar, ordered by PHASE_ORDER. */
export function phasesPresent(calendar: PhaseSpan[]): PhaseCode[] {
  const present = new Set(calendar.map((s) => s.code))
  return PHASE_ORDER.filter((c) => present.has(c))
}

/** Which phase codes are active in a given month (1–12). */
export function phasesInMonth(calendar: PhaseSpan[], month: number): PhaseCode[] {
  const codes = new Set<PhaseCode>()
  for (const span of calendar) {
    if (span.months.includes(month)) codes.add(span.code)
  }
  return PHASE_ORDER.filter((c) => codes.has(c))
}

/** True if any phase (all are jobs) falls in the month — the "something to do this month" hint. */
export function hasActionInMonth(calendar: PhaseSpan[] | undefined, month: number): boolean {
  if (!calendar) return false
  return phasesInMonth(calendar, month).length > 0
}

/** The interest parts the seasonal-interest strip visualises, in render order. */
export const INTEREST_CODES: InterestPart[] = ['foliage', 'flower', 'fruit', 'stem']

/** Season key (schema, lowercase) → display name, in strip column order. */
const SEASON_KEYS: Array<{ key: Season; name: string }> = [
  { key: 'spring', name: 'Spring' },
  { key: 'summer', name: 'Summer' },
  { key: 'autumn', name: 'Autumn' },
  { key: 'winter', name: 'Winter' },
]

/** Display labels for the interest parts (the strip's tooltips + empty-slot hints). */
export const INTEREST_META: Record<InterestPart, { label: string }> = {
  stem: { label: 'Stem' },
  flower: { label: 'Flower' },
  foliage: { label: 'Foliage' },
  fruit: { label: 'Fruit' },
}

export interface SeasonInterest {
  season: string
  /** The interests present that season, each with its resolved colour(s). A part can show
   *  several colours at once (a delphinium flowering blue/purple/white together); `colours`
   *  is empty when it's on show but no colour is recorded. */
  parts: Array<{ code: InterestPart; colours: string[] }>
}

/**
 * Reduce a `seasonalInterest` grid to the per-season shape the strip renders: which of
 * foliage/flower/fruit/stem show in each season and in what colour(s). A part listed for a
 * season is on show then (even with an empty colour list — on show, colour unknown); several
 * colours at once are kept, de-duplicated, order preserved. Reads ONLY the interest grid —
 * the calendar is untouched, they're separate things.
 */
export function seasonalInterest(interest: SeasonalInterest | undefined): SeasonInterest[] {
  return SEASON_KEYS.map(({ key, name }) => {
    const bucket = interest?.[key]
    const parts: SeasonInterest['parts'] = []
    for (const code of INTEREST_CODES) {
      const colours = bucket?.[code]
      if (colours === undefined) continue
      parts.push({ code, colours: [...new Set(colours)] })
    }
    return { season: name, parts }
  })
}
