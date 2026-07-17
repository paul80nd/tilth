import { describe, it, expect } from 'vitest'
import {
  hasActionInMonth,
  isActionable,
  phasesInMonth,
  phasesPresent,
  seasonalInterest,
} from './calendar'
import type { PhaseSpan } from '../schema/plant'

const calendar: PhaseSpan[] = [
  { code: 'sow-indoors', months: [3, 4] },
  { code: 'harvest', months: [8, 9] },
  { code: 'flower', months: [7, 8] },
]

describe('calendar', () => {
  it('classifies actionable vs state codes', () => {
    expect(isActionable('harvest')).toBe(true)
    expect(isActionable('flower')).toBe(false)
  })

  it('lists the phases active in a given month', () => {
    expect(phasesInMonth(calendar, 8)).toEqual(['flower', 'harvest'])
    expect(phasesInMonth(calendar, 1)).toEqual([])
  })

  it('flags a month with an actionable job, but not a state-only month', () => {
    expect(hasActionInMonth(calendar, 8)).toBe(true) // harvest
    expect(hasActionInMonth(calendar, 7)).toBe(false) // flower only (state)
    expect(hasActionInMonth(undefined, 8)).toBe(false)
  })

  it('returns present phases in the canonical order', () => {
    expect(phasesPresent(calendar)).toEqual(['sow-indoors', 'flower', 'harvest'])
  })
})

describe('seasonalInterest', () => {
  const cal: PhaseSpan[] = [
    { code: 'foliage', months: [6, 7, 8], colour: 'green' },
    { code: 'foliage', months: [9, 10], colour: 'yellow' }, // colour changes by season
    { code: 'fruit', months: [9, 10], colour: 'red' },
    { code: 'flower', months: [7] }, // no span colour → fall back to the flat colour field
  ]

  it('summarises each season, letting colour vary through the year', () => {
    const res = seasonalInterest(cal, { flower: ['blue'] })
    const summer = res.find((s) => s.season === 'Summer')!
    const autumn = res.find((s) => s.season === 'Autumn')!
    expect(summer.parts).toContainEqual({ code: 'foliage', colours: ['green'] })
    expect(summer.parts).toContainEqual({ code: 'flower', colours: ['blue'] }) // fallback used
    expect(autumn.parts).toContainEqual({ code: 'foliage', colours: ['yellow'] })
    expect(autumn.parts).toContainEqual({ code: 'fruit', colours: ['red'] })
  })

  it('carries several simultaneous colours for one part (e.g. a multi-coloured bloom)', () => {
    const cal: PhaseSpan[] = [{ code: 'flower', months: [6, 7, 8] }] // no span colour
    const summer = seasonalInterest(cal, { flower: ['blue', 'purple', 'white'] }).find(
      (s) => s.season === 'Summer',
    )!
    expect(summer.parts).toContainEqual({ code: 'flower', colours: ['blue', 'purple', 'white'] })
  })

  it('reports an empty season when nothing is on show', () => {
    const winter = seasonalInterest(cal).find((s) => s.season === 'Winter')!
    expect(winter.parts).toEqual([])
  })

  it('marks a part on show but with no known colour as an empty colour list', () => {
    const cal: PhaseSpan[] = [{ code: 'flower', months: [7] }] // no span colour, no flat colour
    const summer = seasonalInterest(cal).find((s) => s.season === 'Summer')!
    expect(summer.parts).toContainEqual({ code: 'flower', colours: [] })
  })

  it('includes coloured stems as an interest (e.g. winter canes)', () => {
    const stems: PhaseSpan[] = [{ code: 'stem', months: [12, 1, 2], colour: 'red' }]
    const winter = seasonalInterest(stems).find((s) => s.season === 'Winter')!
    expect(winter.parts).toContainEqual({ code: 'stem', colours: ['red'] })
  })
})
