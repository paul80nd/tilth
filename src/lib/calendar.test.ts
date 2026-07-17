import { describe, it, expect } from 'vitest'
import {
  hasActionInMonth,
  phasesInMonth,
  phasesPresent,
  seasonalInterest,
} from './calendar'
import type { PhaseSpan, SeasonalInterest } from '../schema/plant'

const calendar: PhaseSpan[] = [
  { code: 'sow-indoors', months: [3, 4] },
  { code: 'harvest', months: [8, 9] },
]

describe('calendar', () => {
  it('lists the phases active in a given month', () => {
    expect(phasesInMonth(calendar, 8)).toEqual(['harvest'])
    expect(phasesInMonth(calendar, 1)).toEqual([])
  })

  it('flags a month that has a job, not an empty month', () => {
    expect(hasActionInMonth(calendar, 8)).toBe(true) // harvest
    expect(hasActionInMonth(calendar, 1)).toBe(false) // nothing to do
    expect(hasActionInMonth(undefined, 8)).toBe(false)
  })

  it('returns present phases in the canonical order', () => {
    expect(phasesPresent(calendar)).toEqual(['sow-indoors', 'harvest'])
  })
})

describe('seasonalInterest', () => {
  // The season × part grid, read straight from the plant's own field.
  const interest: SeasonalInterest = {
    spring: { flower: ['pink'], foliage: ['green'] },
    summer: { foliage: ['green'] },
    autumn: { foliage: ['green'], fruit: ['orange', 'red'] },
  }

  it('summarises each season from the interest grid', () => {
    const res = seasonalInterest(interest)
    const spring = res.find((s) => s.season === 'Spring')!
    const autumn = res.find((s) => s.season === 'Autumn')!
    expect(spring.parts).toContainEqual({ code: 'flower', colours: ['pink'] })
    expect(spring.parts).toContainEqual({ code: 'foliage', colours: ['green'] })
    expect(autumn.parts).toContainEqual({ code: 'fruit', colours: ['orange', 'red'] })
  })

  it('carries several simultaneous colours for one part (e.g. a multi-coloured bloom)', () => {
    const summer = seasonalInterest({ summer: { flower: ['blue', 'purple', 'white'] } }).find(
      (s) => s.season === 'Summer',
    )!
    expect(summer.parts).toContainEqual({ code: 'flower', colours: ['blue', 'purple', 'white'] })
  })

  it('reports an empty season when nothing is on show', () => {
    const winter = seasonalInterest(interest).find((s) => s.season === 'Winter')!
    expect(winter.parts).toEqual([])
  })

  it('marks a part on show but with no known colour as an empty colour list', () => {
    const summer = seasonalInterest({ summer: { flower: [] } }).find((s) => s.season === 'Summer')!
    expect(summer.parts).toContainEqual({ code: 'flower', colours: [] })
  })

  it('de-duplicates repeated colours, order preserved', () => {
    const autumn = seasonalInterest({ autumn: { fruit: ['red', 'red', 'orange'] } }).find(
      (s) => s.season === 'Autumn',
    )!
    expect(autumn.parts).toContainEqual({ code: 'fruit', colours: ['red', 'orange'] })
  })

  it('returns four empty seasons when there is no interest recorded', () => {
    const res = seasonalInterest(undefined)
    expect(res.map((s) => s.season)).toEqual(['Spring', 'Summer', 'Autumn', 'Winter'])
    expect(res.every((s) => s.parts.length === 0)).toBe(true)
  })
})
