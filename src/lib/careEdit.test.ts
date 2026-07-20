import { describe, expect, it } from 'vitest'
import { makeTask } from '../../test/factories'
import { careDiff, draftToTask, newTaskDraft, toTaskDrafts, type TaskDraft } from './careEdit'

describe('draftToTask', () => {
  it('trims, de-dupes + sorts months, and drops empty note/cadence', () => {
    const t = draftToTask({ id: 't1', action: '  Winter prune  ', months: [3, 1, 1], note: '  ', cadence: '', scopeNodeId: 'apple' })
    expect(t).toEqual({ id: 't1', action: 'Winter prune', months: [1, 3], scopeNodeId: 'apple' })
  })
  it('keeps a valid cadence and note', () => {
    const t = draftToTask({ id: 't1', action: 'Water', months: [], note: 'At the base', cadence: 'ongoing', scopeNodeId: 'apple' })
    expect(t).toMatchObject({ note: 'At the base', cadence: 'ongoing', months: [] })
  })
})

describe('careDiff', () => {
  const initial = [
    makeTask({ id: 't-prune', action: 'Winter prune', months: [1, 2], scopeNodeId: 'apple', cadence: 'once', provenance: { source: 'rhs' } }),
    makeTask({ id: 't-water', action: 'Water in dry spells', months: [], scopeNodeId: 'apple', cadence: 'ongoing', provenance: { source: 'rhs' } }),
  ]
  const draftsOf = (over?: (d: TaskDraft[]) => TaskDraft[]) => {
    const base = toTaskDrafts(initial)
    return over ? over(base) : base
  }

  it('writes nothing when nothing changed (provenance ignored)', () => {
    const { upserts, deletedIds } = careDiff(initial, draftsOf())
    expect(upserts).toEqual([])
    expect(deletedIds).toEqual([])
  })

  it('upserts only the changed task', () => {
    const { upserts, deletedIds } = careDiff(
      initial,
      draftsOf((d) => d.map((row) => (row.id === 't-water' ? { ...row, cadence: 'once', note: 'Keep evenly moist' } : row))),
    )
    expect(deletedIds).toEqual([])
    expect(upserts).toHaveLength(1)
    expect(upserts[0]).toMatchObject({ id: 't-water', cadence: 'once', note: 'Keep evenly moist' })
  })

  it('marks a removed row for deletion', () => {
    const { upserts, deletedIds } = careDiff(initial, draftsOf((d) => d.filter((row) => row.id !== 't-prune')))
    expect(upserts).toEqual([])
    expect(deletedIds).toEqual(['t-prune'])
  })

  it('treats a blanked-action row as a deletion', () => {
    const { deletedIds } = careDiff(initial, draftsOf((d) => d.map((row) => (row.id === 't-prune' ? { ...row, action: '  ' } : row))))
    expect(deletedIds).toEqual(['t-prune'])
  })

  it('upserts a brand-new drafted task', () => {
    const { upserts, deletedIds } = careDiff(
      initial,
      draftsOf((d) => [...d, { ...newTaskDraft('t-mulch', 'apple'), action: 'Mulch', months: [3], cadence: 'once' }]),
    )
    expect(deletedIds).toEqual([])
    expect(upserts).toHaveLength(1)
    expect(upserts[0]).toMatchObject({ id: 't-mulch', action: 'Mulch', months: [3], scopeNodeId: 'apple', cadence: 'once' })
  })

  it('ignores an unfilled new row (blank action)', () => {
    const { upserts, deletedIds } = careDiff(initial, draftsOf((d) => [...d, newTaskDraft('t-blank', 'apple')]))
    expect(upserts).toEqual([])
    expect(deletedIds).toEqual([])
  })
})
