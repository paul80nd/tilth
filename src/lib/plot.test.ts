import { describe, it, expect } from 'vitest'
import { snap, snapRect, clampRect, overlaps, cellsAcross, reanchorRects } from './plot'

describe('snap', () => {
  it('rounds to the nearest step', () => {
    expect(snap(0.34, 0.1)).toBeCloseTo(0.3)
    expect(snap(0.36, 0.1)).toBeCloseTo(0.4)
  })
  it('is a no-op for a non-positive step', () => {
    expect(snap(0.34, 0)).toBe(0.34)
  })
})

describe('snapRect', () => {
  it('snaps position and size, keeping at least one step', () => {
    const r = snapRect({ x: 0.12, y: 0.29, width: 0.04, height: 0.61 }, 0.1)
    expect(r).toEqual({ x: 0.1, y: 0.3, width: 0.1, height: 0.6 })
  })
})

describe('clampRect', () => {
  it('nudges a rect back inside the container', () => {
    expect(clampRect({ x: -1, y: 5, width: 2, height: 2 }, 10, 6)).toEqual({
      x: 0,
      y: 4,
      width: 2,
      height: 2,
    })
  })
  it('shrinks a rect larger than the container', () => {
    expect(clampRect({ x: 0, y: 0, width: 20, height: 20 }, 10, 6)).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 6,
    })
  })
})

describe('overlaps', () => {
  it('detects overlap', () => {
    expect(overlaps({ x: 0, y: 0, width: 2, height: 2 }, { x: 1, y: 1, width: 2, height: 2 })).toBe(
      true,
    )
  })
  it('treats flush edges as not overlapping', () => {
    expect(overlaps({ x: 0, y: 0, width: 2, height: 2 }, { x: 2, y: 0, width: 2, height: 2 })).toBe(
      false,
    )
  })
})

describe('cellsAcross', () => {
  it('rounds to whole cells, at least one', () => {
    expect(cellsAcross(1.2, 0.3)).toBe(4)
    expect(cellsAcross(0.1, 0.3)).toBe(1)
    expect(cellsAcross(5, 0)).toBe(0)
  })
})

describe('reanchorRects', () => {
  const bed = { x: 1, y: 1, width: 2, height: 2 }

  it('leaves rects put when anchored NW (origin fixed, plot grows right/down)', () => {
    expect(reanchorRects([bed], 10, 10, 14, 12, 'NW')).toEqual([bed])
  })

  it('shifts rects by the size delta when anchored SE (far corner fixed)', () => {
    expect(reanchorRects([bed], 10, 10, 14, 12, 'SE')).toEqual([{ x: 5, y: 3, width: 2, height: 2 }])
  })

  it('shifts only the anchored axis for an edge corner', () => {
    // NE keeps the right edge fixed (x shifts by +Δw) but the top fixed (y unchanged).
    expect(reanchorRects([bed], 10, 10, 14, 10, 'NE')).toEqual([{ x: 5, y: 1, width: 2, height: 2 }])
  })

  it('clamps a rect that a shrink would push past the new edge', () => {
    // Anchored NW, shrink to 2×2: the bed sitting at x=1,w=2 no longer fits — pulled back to x=0.
    expect(reanchorRects([bed], 10, 10, 2, 2, 'NW')).toEqual([{ x: 0, y: 0, width: 2, height: 2 }])
  })
})
