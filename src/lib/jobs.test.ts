import { describe, expect, it } from 'vitest'
import { makeHolding, makeNode, makeTask } from '../../test/factories'
import { buildJobs, formatMonths } from './jobs'

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
})
