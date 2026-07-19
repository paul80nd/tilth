import { describe, it, expect } from 'vitest'
import { splitLegacyConditions } from './positionSplit'
import type { PlantNode } from '../schema/plant'

const base = (over: Partial<PlantNode>): PlantNode => ({ id: 'n', rank: 'species', ...over })

describe('splitLegacyConditions', () => {
  it('moves position facets out of a combined conditions object', () => {
    const node = base({
      conditions: { soil: ['loam'], moisture: ['moist'], sun: ['full-sun'], hardiness: 'H5' } as never,
      provenance: { conditions: { source: 'rhs' } },
    })
    const out = splitLegacyConditions(node)
    expect(out.conditions).toEqual({ soil: ['loam'], moisture: ['moist'] })
    expect(out.position).toEqual({ sun: ['full-sun'], hardiness: 'H5' })
    // position inherits the old conditions provenance; conditions keeps its own.
    expect(out.provenance?.position).toEqual({ source: 'rhs' })
    expect(out.provenance?.conditions).toEqual({ source: 'rhs' })
  })

  it('drops conditions entirely when it held only position facets', () => {
    const node = base({
      conditions: { sun: ['full-sun'], aspect: ['south'] } as never,
      provenance: { conditions: { source: 'manual' } },
    })
    const out = splitLegacyConditions(node)
    expect(out.conditions).toBeUndefined()
    expect(out.position).toEqual({ sun: ['full-sun'], aspect: ['south'] })
    expect(out.provenance?.conditions).toBeUndefined()
    expect(out.provenance?.position).toEqual({ source: 'manual' })
  })

  it('is a no-op (same reference) for an already-split node', () => {
    const node = base({ conditions: { soil: ['clay'] }, position: { sun: ['full-sun'] } })
    expect(splitLegacyConditions(node)).toBe(node)
  })

  it('is a no-op for a node with no conditions', () => {
    const node = base({ size: { height: '1m' } })
    expect(splitLegacyConditions(node)).toBe(node)
  })

  it('keeps an existing own position facet over the extracted one', () => {
    const node = base({
      conditions: { soil: ['sand'], sun: ['full-shade'] } as never,
      position: { sun: ['full-sun'] },
    })
    const out = splitLegacyConditions(node)
    expect(out.position?.sun).toEqual(['full-sun']) // own wins
    expect(out.conditions).toEqual({ soil: ['sand'] })
  })
})
