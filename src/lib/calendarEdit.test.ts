import { describe, it, expect } from 'vitest'
import type { PhaseSpan } from '../schema/plant'
import { toCalendarDraft, fromCalendarDraft } from './calendarEdit'

describe('toCalendarDraft', () => {
  it('gives every phase code a row, off by default', () => {
    const draft = toCalendarDraft(undefined)
    expect(draft['flowers'].months).toEqual(Array(12).fill(false))
    expect(draft['flowers'].note).toBe('')
    // A code with no spans is present but empty.
    expect(Object.keys(draft)).toContain('harvest')
  })

  it('marks the months a phase is active and keeps its note', () => {
    const calendar: PhaseSpan[] = [{ code: 'harvest', months: [8, 9], note: 'main crop' }]
    const draft = toCalendarDraft(calendar)
    expect(draft['harvest'].months[7]).toBe(true) // August
    expect(draft['harvest'].months[8]).toBe(true) // September
    expect(draft['harvest'].months[0]).toBe(false)
    expect(draft['harvest'].note).toBe('main crop')
  })

  it('unions the months of multiple spans of the same code', () => {
    const calendar: PhaseSpan[] = [
      { code: 'harvest', months: [7] },
      { code: 'harvest', months: [9], note: 'late' },
    ]
    const draft = toCalendarDraft(calendar)
    expect(draft['harvest'].months[6]).toBe(true) // July
    expect(draft['harvest'].months[8]).toBe(true) // September
    expect(draft['harvest'].note).toBe('late') // first non-empty note
  })
})

describe('fromCalendarDraft', () => {
  it('drops phases with no months selected', () => {
    const draft = toCalendarDraft(undefined)
    expect(fromCalendarDraft(draft)).toEqual([])
  })

  it('collapses a row to one span in PHASE_ORDER, note only when set', () => {
    const draft = toCalendarDraft(undefined)
    draft['harvest'].months[7] = true // August
    draft['harvest'].months[8] = true // September
    draft['sow-indoors'].months[1] = true // February
    const out = fromCalendarDraft(draft)
    // sow-indoors comes before harvest in PHASE_ORDER
    expect(out).toEqual([
      { code: 'sow-indoors', months: [2] },
      { code: 'harvest', months: [8, 9] },
    ])
  })

  it('carries a note when present', () => {
    const draft = toCalendarDraft(undefined)
    draft['flowers'].months[2] = true
    draft['flowers'].note = 'first blooms'
    expect(fromCalendarDraft(draft)).toEqual([{ code: 'flowers', months: [3], note: 'first blooms' }])
  })

  it('round-trips a calendar through draft and back', () => {
    const calendar: PhaseSpan[] = [
      { code: 'sow-indoors', months: [2, 3] },
      { code: 'plant-out', months: [5] },
      { code: 'harvest', months: [8, 9, 10], note: 'pick often' },
    ]
    expect(fromCalendarDraft(toCalendarDraft(calendar))).toEqual(calendar)
  })
})
