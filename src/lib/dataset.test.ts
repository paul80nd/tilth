import { describe, it, expect } from 'vitest'
import { parsePlantDataset } from './dataset'

describe('parsePlantDataset', () => {
  it('preserves partiality — copies through only the fields present, no injected defaults', () => {
    const { nodes } = parsePlantDataset({
      version: 1,
      nodes: [{ id: 'rose', rank: 'species', commonName: 'Rose' }],
    })
    // Exactly the supplied keys — absence must survive so the merge leaves other fields alone.
    expect(nodes[0]).toEqual({ id: 'rose', rank: 'species', commonName: 'Rose' })
    expect('category' in nodes[0]).toBe(false)
  })

  it('trims strings and drops whitespace-only ones as absent', () => {
    const { nodes } = parsePlantDataset({
      nodes: [{ id: 'x', commonName: '  Foxglove  ', variety: '   ' }],
    })
    expect(nodes[0].commonName).toBe('Foxglove')
    expect('variety' in nodes[0]).toBe(false)
  })

  it('passes arrays and nested objects through as whole fields', () => {
    const calendar = [
      { code: 'sow-indoors', months: [3, 4] },
      { code: 'harvest', months: [6, 7] },
    ]
    const conditions = { soil: ['loam'], moisture: ['moist'], ph: ['neutral'] }
    const { nodes } = parsePlantDataset({ nodes: [{ id: 'x', calendar, conditions, awards: ['A', 'B'] }] })
    expect(nodes[0].calendar).toEqual(calendar)
    expect(nodes[0].conditions).toEqual(conditions)
    expect(nodes[0].awards).toEqual(['A', 'B'])
  })

  it('splits a legacy combined conditions (soil + position) into the two fields', () => {
    const { nodes } = parsePlantDataset({
      nodes: [{ id: 'x', conditions: { soil: ['loam'], sun: ['full-sun'], hardiness: 'H5' } }],
    })
    expect(nodes[0].conditions).toEqual({ soil: ['loam'] })
    expect(nodes[0].position).toEqual({ sun: ['full-sun'], hardiness: 'H5' })
  })

  it('passes the descriptive fields through (colour, edible, wildlife, uses, names, synonyms)', () => {
    const seasonalInterest = { summer: { flower: ['yellow'], fruit: ['red'] } }
    const { nodes } = parsePlantDataset({
      nodes: [
        {
          id: 'x',
          seasonalInterest,
          edible: ['fruit'],
          toxicity: 'Harmful if eaten',
          wildlife: ['attracts pollinators'],
          uses: ['containers'],
          otherNames: ['Love apple'],
          synonyms: ['Lycopersicon esculentum'],
        },
      ],
    })
    const n = nodes[0]
    expect(n.seasonalInterest).toEqual(seasonalInterest)
    expect(n.edible).toEqual(['fruit'])
    expect(n.toxicity).toBe('Harmful if eaten')
    expect(n.wildlife).toEqual(['attracts pollinators'])
    expect(n.uses).toEqual(['containers'])
    expect(n.otherNames).toEqual(['Love apple'])
    expect(n.synonyms).toEqual(['Lycopersicon esculentum'])
  })

  it('never stamps provenance from the fragment (the merge owns it)', () => {
    const { nodes } = parsePlantDataset({
      nodes: [{ id: 'x', provenance: { commonName: { source: 'forged' } } }],
    })
    expect('provenance' in nodes[0]).toBe(false)
  })

  it('drops records missing an id, with a reason, keeping the rest', () => {
    const { nodes, errors, skipped } = parsePlantDataset({
      nodes: [{ rank: 'species' }, { id: 'ok' }],
    })
    expect(nodes.map((n) => n.id)).toEqual(['ok'])
    expect(skipped).toBe(1)
    expect(errors[0]).toMatch(/missing id/)
  })

  it('keeps the first of duplicate ids and reports the rest', () => {
    const { nodes, errors } = parsePlantDataset({
      nodes: [{ id: 'dup', commonName: 'First' }, { id: 'dup', commonName: 'Second' }],
    })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].commonName).toBe('First')
    expect(errors[0]).toMatch(/duplicate id/)
  })

  it('accepts a bare array of nodes', () => {
    const { nodes } = parsePlantDataset([{ id: 'a' }, { id: 'b' }])
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('reads the whole-fragment source key from the wrapper', () => {
    expect(parsePlantDataset({ source: 'seed-packet', nodes: [] }).source).toBe('seed-packet')
  })

  it('validates guides and tasks, requiring a title / action', () => {
    const { guides, tasks, errors } = parsePlantDataset({
      guides: [{ id: 'g1', title: 'Pruning' }, { id: 'g2' }],
      tasks: [{ id: 't1', action: 'Thin', months: [6, 13] }, { id: 't2', months: [1] }],
    })
    expect(guides.map((g) => g.id)).toEqual(['g1'])
    expect(tasks[0].months).toEqual([6]) // out-of-range month dropped
    expect(tasks.map((t) => t.id)).toEqual(['t1'])
    expect(errors).toHaveLength(2)
  })

  it('carries a valid task cadence and drops an invalid one', () => {
    const { tasks } = parsePlantDataset({
      tasks: [
        { id: 't1', action: 'Winter prune', months: [1], cadence: 'once' },
        { id: 't2', action: 'Water', months: [], cadence: 'ongoing' },
        { id: 't3', action: 'Feed', months: [], cadence: 'sometimes' },
      ],
    })
    expect(tasks.find((t) => t.id === 't1')?.cadence).toBe('once')
    expect(tasks.find((t) => t.id === 't2')?.cadence).toBe('ongoing')
    expect(tasks.find((t) => t.id === 't3')?.cadence).toBeUndefined() // invalid → left off
  })

  it('reports invalid JSON text rather than throwing', () => {
    const { errors, skipped } = parsePlantDataset('{ not json')
    expect(skipped).toBe(1)
    expect(errors[0]).toMatch(/not valid JSON/)
  })
})
