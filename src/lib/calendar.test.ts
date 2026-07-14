import { describe, it, expect } from 'vitest'
import { hasActionInMonth, isActionable, phasesInMonth, phasesPresent } from './calendar'
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
