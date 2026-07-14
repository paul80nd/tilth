// Pure calendar helpers. The 12-month chart and the (later) jobs engine both read phase
// metadata from here: each PhaseCode's label, whether it's ACTIONABLE (a job — sow, prune,
// harvest…) or a display-only STATE (flower/foliage/fruit), and the token the UI colours it
// with. Colour lives in CSS (--tl-phase-*); this only names the token class, never a hex.

import type { PhaseCode, PhaseSpan } from '../schema/plant'

export type PhaseKind = 'action' | 'state'

export interface PhaseMeta {
  label: string
  kind: PhaseKind
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
  'flower',
  'foliage',
  'fruit',
  'harvest',
]

export const PHASE_META: Record<PhaseCode, PhaseMeta> = {
  'sow-indoors': { label: 'Sow indoors', kind: 'action', token: 'sow-indoors' },
  'sow-outdoors': { label: 'Sow outdoors', kind: 'action', token: 'sow-outdoors' },
  'pot-on': { label: 'Pot on', kind: 'action', token: 'pot-on' },
  'plant-out': { label: 'Plant out', kind: 'action', token: 'plant-out' },
  thin: { label: 'Thin', kind: 'action', token: 'thin' },
  prune: { label: 'Prune', kind: 'action', token: 'prune' },
  divide: { label: 'Divide', kind: 'action', token: 'divide' },
  feed: { label: 'Feed', kind: 'action', token: 'feed' },
  harvest: { label: 'Harvest', kind: 'action', token: 'harvest' },
  flower: { label: 'In flower', kind: 'state', token: 'flower' },
  foliage: { label: 'In leaf', kind: 'state', token: 'foliage' },
  fruit: { label: 'In fruit', kind: 'state', token: 'fruit' },
}

export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function isActionable(code: PhaseCode): boolean {
  return PHASE_META[code].kind === 'action'
}

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

/** True if any ACTIONABLE phase falls in the month — the "something to do this month" hint. */
export function hasActionInMonth(calendar: PhaseSpan[] | undefined, month: number): boolean {
  if (!calendar) return false
  return phasesInMonth(calendar, month).some(isActionable)
}

/** Northern-hemisphere seasons as month groups, for the seasonal-interest strip. */
export const SEASONS: Array<{ name: string; months: number[] }> = [
  { name: 'Spring', months: [3, 4, 5] },
  { name: 'Summer', months: [6, 7, 8] },
  { name: 'Autumn', months: [9, 10, 11] },
  { name: 'Winter', months: [12, 1, 2] },
]

/** The state (display) phases the seasonal-interest strip visualises, in render order. */
export const INTEREST_CODES: PhaseCode[] = ['foliage', 'flower', 'fruit']

export interface SeasonInterest {
  season: string
  /** The interests present that season, each with its resolved colour (if known). */
  parts: Array<{ code: PhaseCode; colour?: string }>
}

/**
 * Reduce a calendar (+ optional flat colour fallback) to per-season interest: which of
 * foliage/flower/fruit show in each season and in what colour. Colour comes from the covering
 * `PhaseSpan.colour` (so it can vary by season — green foliage → yellow in autumn), falling
 * back to the flat `colour[part]` when a span carries no colour of its own.
 */
export function seasonalInterest(
  calendar: PhaseSpan[] | undefined,
  colour?: { flower?: string[]; foliage?: string[]; fruit?: string[]; stem?: string[] },
): SeasonInterest[] {
  if (!calendar) return SEASONS.map((s) => ({ season: s.name, parts: [] }))
  return SEASONS.map((season) => {
    const parts: SeasonInterest['parts'] = []
    for (const code of INTEREST_CODES) {
      const spans = calendar.filter(
        (s) => s.code === code && s.months.some((m) => season.months.includes(m)),
      )
      if (spans.length === 0) continue
      const fallback = colour?.[code as 'flower' | 'foliage' | 'fruit']?.[0]
      const colours = new Set<string | undefined>(spans.map((s) => s.colour ?? fallback))
      for (const c of colours) parts.push({ code, colour: c })
    }
    return { season: season.name, parts }
  })
}
