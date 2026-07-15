import { describe, it, expect } from 'vitest'
import { parseBackup } from './backup'
import type { BackupSnapshot } from '../schema/userData'

const full: BackupSnapshot = {
  version: 1,
  exportedAt: '2026-07-15T00:00:00.000Z',
  nodes: [
    {
      id: 'rhubarb',
      rank: 'cultivar',
      commonName: 'Rhubarb',
      provenance: { commonName: { source: 'plant-db' } },
    },
  ],
  guides: [],
  tasks: [],
  holdings: [{ id: 'h1', nodeId: 'rhubarb', status: 'growing' }],
  jobLog: [],
  settings: [{ key: 'dataSource', value: 'user' }],
}

describe('parseBackup', () => {
  it('accepts a well-formed snapshot and preserves provenance', () => {
    const { snapshot, warnings } = parseBackup(full)
    expect(warnings).toEqual([])
    expect(snapshot.nodes[0].provenance?.commonName?.source).toBe('plant-db')
    expect(snapshot.holdings[0].nodeId).toBe('rhubarb')
  })

  it('parses the JSON text form', () => {
    const { snapshot } = parseBackup(JSON.stringify(full))
    expect(snapshot.nodes).toHaveLength(1)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseBackup('{not json')).toThrow(/not valid JSON/)
  })

  it('throws when it is not an object', () => {
    expect(() => parseBackup(42)).toThrow(/not an object/)
  })

  it('throws on an unsupported version', () => {
    expect(() => parseBackup({ ...full, version: 99 })).toThrow(/unsupported backup version 99/)
  })

  it('throws when the nodes array is missing (not our file)', () => {
    const { nodes: _drop, ...noNodes } = full
    expect(() => parseBackup(noNodes)).toThrow(/no nodes array/)
  })

  it('drops a malformed record with a warning, keeps the good ones', () => {
    const { snapshot, warnings } = parseBackup({
      ...full,
      nodes: [full.nodes[0], { rank: 'species' }, 'nope'],
    })
    expect(snapshot.nodes).toHaveLength(1)
    expect(warnings.some((w) => w.includes('2 node'))).toBe(true)
  })

  it('defaults absent optional tables to empty arrays', () => {
    const { snapshot } = parseBackup({ version: 1, nodes: [] })
    expect(snapshot.guides).toEqual([])
    expect(snapshot.holdings).toEqual([])
    expect(snapshot.settings).toEqual([])
    expect(snapshot.exportedAt).toBe('')
  })
})
