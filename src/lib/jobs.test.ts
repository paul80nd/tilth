import { describe, expect, it } from 'vitest'
import { makeHolding, makeNode, makeTask } from '../../test/factories'
import { buildJobs, formatMonths, groupJobs, type Job } from './jobs'

describe('formatMonths', () => {
  it('labels an empty month list as Anytime', () => {
    expect(formatMonths([])).toBe('Anytime')
  })
  it('labels a single month', () => {
    expect(formatMonths([3])).toBe('Mar')
  })
  it('labels a contiguous run as a range', () => {
    expect(formatMonths([6, 7])).toBe('Jun–Jul')
    expect(formatMonths([3, 4, 5])).toBe('Mar–May')
  })
  it('labels a run that wraps the year end', () => {
    expect(formatMonths([11, 12, 1, 2])).toBe('Nov–Feb')
  })
  it('lists scattered months in calendar order', () => {
    expect(formatMonths([6, 9])).toBe('Jun, Sep')
  })
  it('is order- and duplicate-insensitive', () => {
    expect(formatMonths([2, 1, 12, 11, 11])).toBe('Nov–Feb')
  })
})

// A small taxonomy: genus Malus → species Apple → two (fictional) cultivars, plus an unrelated
// held plant to prove non-matching tasks stay off the list.
const nodes = [
  makeNode({ id: 'malus', rank: 'genus', botanicalName: 'Malus' }),
  makeNode({ id: 'apple', rank: 'species', parentId: 'malus', commonName: 'Apple', category: 'fruit' }),
  makeNode({ id: 'apple-a', rank: 'cultivar', parentId: 'apple', commonName: 'Apple', variety: 'Redglow' }),
  makeNode({ id: 'apple-b', rank: 'cultivar', parentId: 'apple', commonName: 'Apple', variety: 'Sweetcrop' }),
  makeNode({ id: 'basil', rank: 'species', commonName: 'Basil', category: 'herb' }),
]

/** Flatten every job in a month for easy assertions. */
function monthJobs(cal: ReturnType<typeof buildJobs>, month: number) {
  return cal.months[month - 1].jobs
}

describe('buildJobs — maintenance tasks', () => {
  it('rolls a species-scoped task down onto a held cultivar, in the right months', () => {
    const cal = buildJobs({
      nodes,
      holdings: [makeHolding({ id: 'h1', nodeId: 'apple-a' })],
      tasks: [makeTask({ id: 't-prune', action: 'Winter prune', months: [11, 12, 1, 2], scopeNodeId: 'apple' })],
    })
    const jan = monthJobs(cal, 1)
    expect(jan).toHaveLength(1)
    expect(jan[0]).toMatchObject({ action: 'Winter prune', subjectName: 'Apple', holdingIds: ['h1'] })
    // Present in every listed month, absent from an unlisted one.
    expect(monthJobs(cal, 12)).toHaveLength(1)
    expect(monthJobs(cal, 6)).toHaveLength(0)
  })

  it('de-duplicates one task across two cultivars of the same species', () => {
    const cal = buildJobs({
      nodes,
      holdings: [
        makeHolding({ id: 'h1', nodeId: 'apple-a' }),
        makeHolding({ id: 'h2', nodeId: 'apple-b' }),
      ],
      tasks: [makeTask({ id: 't-prune', action: 'Winter prune', months: [1], scopeNodeId: 'apple' })],
    })
    const jan = monthJobs(cal, 1)
    expect(jan).toHaveLength(1)
    expect(jan[0].holdingIds).toEqual(['h1', 'h2'])
  })

  it('matches a category-scoped task against a held plant of that category', () => {
    const cal = buildJobs({
      nodes,
      holdings: [makeHolding({ id: 'h1', nodeId: 'apple-a' })],
      tasks: [makeTask({ id: 't-mulch', action: 'Mulch', months: [3], scopeCategory: 'fruit' })],
    })
    expect(monthJobs(cal, 3)[0]).toMatchObject({ action: 'Mulch', subjectName: 'Fruit' })
  })

  it('puts a condition-based task (no months) in the anytime bucket, not a month', () => {
    const cal = buildJobs({
      nodes,
      holdings: [makeHolding({ id: 'h1', nodeId: 'apple-a' })],
      tasks: [makeTask({ id: 't-water', action: 'Water in dry spells', months: [], scopeNodeId: 'apple' })],
    })
    expect(cal.anytime).toHaveLength(1)
    expect(cal.anytime[0].action).toBe('Water in dry spells')
    expect(cal.months.every((m) => m.jobs.length === 0)).toBe(true)
  })

  it('omits a task that reaches no held plant', () => {
    const cal = buildJobs({
      nodes,
      holdings: [makeHolding({ id: 'h1', nodeId: 'basil' })],
      tasks: [makeTask({ id: 't-prune', action: 'Winter prune', months: [1], scopeNodeId: 'apple' })],
    })
    expect(monthJobs(cal, 1)).toHaveLength(0)
  })

  it('ignores holdings that are not growing by default', () => {
    const cal = buildJobs({
      nodes,
      holdings: [makeHolding({ id: 'h1', nodeId: 'apple-a', status: 'archived' })],
      tasks: [makeTask({ id: 't-prune', action: 'Winter prune', months: [1], scopeNodeId: 'apple' })],
    })
    expect(monthJobs(cal, 1)).toHaveLength(0)
  })

  it('tags each job with the subject’s own-or-inherited category', () => {
    const cal = buildJobs({
      nodes,
      holdings: [makeHolding({ id: 'h1', nodeId: 'apple-a' })],
      tasks: [
        makeTask({ id: 't-prune', action: 'Winter prune', months: [1], scopeNodeId: 'apple' }),
        makeTask({ id: 't-mulch', action: 'Mulch', months: [3], scopeCategory: 'fruit' }),
      ],
    })
    // Species-scoped → inherits the species' own category; category-scoped → the scope itself.
    expect(monthJobs(cal, 1)[0].subjectCategory).toBe('fruit')
    expect(monthJobs(cal, 3)[0].subjectCategory).toBe('fruit')
  })
})

// Build a display Job directly — groupJobs is pure over the flat Job[] a month bucket holds.
function job(over: Partial<Job> & { action: string; subjectId: string; subjectName: string }): Job {
  return { key: `task:${over.subjectId}:${over.action}`, months: [], holdingIds: [], ...over }
}

describe('groupJobs — display grouping', () => {
  it('returns no groups for an empty month', () => {
    expect(groupJobs([])).toEqual([])
  })

  it('collapses an identical job (same action + note) across crops into one multi-subject row', () => {
    const groups = groupJobs([
      job({ action: 'Water in dry spells', subjectId: 'apple', subjectName: 'Apple', subjectCategory: 'fruit', note: 'Keep evenly moist' }),
      job({ action: 'Water in dry spells', subjectId: 'pear', subjectName: 'Pear', subjectCategory: 'fruit', note: 'Keep evenly moist' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].action).toBe('Water in dry spells')
    expect(groups[0].rows).toHaveLength(1)
    expect(groups[0].rows[0].subjects.map((s) => s.name)).toEqual(['Apple', 'Pear'])
    expect(groups[0].rows[0].keys).toHaveLength(2)
  })

  it('keeps crops with distinct notes as separate rows under one action heading', () => {
    const groups = groupJobs([
      job({ action: 'Winter prune', subjectId: 'apple', subjectName: 'Apple', subjectCategory: 'fruit', note: 'Prune to an open goblet' }),
      job({ action: 'Winter prune', subjectId: 'grape', subjectName: 'Grape', subjectCategory: 'fruit', note: 'Prune back to two buds' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].rows).toHaveLength(2)
    // rows sort by first subject name
    expect(groups[0].rows.map((r) => r.subjects[0].name)).toEqual(['Apple', 'Grape'])
  })

  it('de-duplicates a subject that appears twice in one row and sorts subjects by name', () => {
    const groups = groupJobs([
      job({ action: 'Mulch', subjectId: 'pear', subjectName: 'Pear', subjectCategory: 'fruit' }),
      job({ action: 'Mulch', subjectId: 'apple', subjectName: 'Apple', subjectCategory: 'fruit' }),
      job({ action: 'Mulch', subjectId: 'apple', subjectName: 'Apple', subjectCategory: 'fruit' }),
    ])
    expect(groups[0].rows[0].subjects.map((s) => s.name)).toEqual(['Apple', 'Pear'])
  })

  it('clusters groups by category then action', () => {
    const groups = groupJobs([
      job({ action: 'Deadhead', subjectId: 'rosa', subjectName: 'Rose', subjectCategory: 'flower' }),
      job({ action: 'Mulch', subjectId: 'apple', subjectName: 'Apple', subjectCategory: 'fruit' }),
      job({ action: 'Feed', subjectId: 'dahlia', subjectName: 'Dahlia', subjectCategory: 'flower' }),
    ])
    // flower (Deadhead, Feed) before fruit (Mulch); within flower, action A→Z.
    expect(groups.map((g) => g.action)).toEqual(['Deadhead', 'Feed', 'Mulch'])
  })

  it('treats a job with no note as its own row, never merged with a noted one', () => {
    const groups = groupJobs([
      job({ action: 'Feed', subjectId: 'apple', subjectName: 'Apple', subjectCategory: 'fruit', note: 'High potash' }),
      job({ action: 'Feed', subjectId: 'pear', subjectName: 'Pear', subjectCategory: 'fruit' }),
    ])
    expect(groups[0].rows).toHaveLength(2)
    const notes = groups[0].rows.map((r) => r.note)
    expect(notes).toContain('High potash')
    expect(notes).toContain(undefined)
  })
})
