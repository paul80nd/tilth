import { describe, it, expect } from 'vitest'
import { deepEqual, isPlainObject } from './equal'

describe('deepEqual', () => {
  it('compares scalars by value (identity fast-path)', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual(true, true)).toBe(true)
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(undefined, undefined)).toBe(true)
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('a', 'b')).toBe(false)
    expect(deepEqual(0, '0')).toBe(false)
    expect(deepEqual(null, undefined)).toBe(false)
  })

  it('compares arrays element-wise, order-sensitive', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([], [])).toBe(true)
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual(['a'], ['a', 'b'])).toBe(false)
  })

  it('compares plain objects key-by-key, ignoring key order', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false)
  })

  it('recurses through nested arrays and objects (the source-link + facts shapes)', () => {
    const a = { soil: ['loam', 'clay'], facts: { ph: 'acid', spread: '2m' } }
    const b = { facts: { spread: '2m', ph: 'acid' }, soil: ['loam', 'clay'] }
    expect(deepEqual(a, b)).toBe(true)
    expect(deepEqual(a, { ...a, soil: ['loam'] })).toBe(false)
    const links = [{ source: 'rhs', url: 'x' }]
    expect(deepEqual(links, [{ source: 'rhs', url: 'x' }])).toBe(true)
    expect(deepEqual(links, [{ source: 'rhs', url: 'y' }])).toBe(false)
  })

  it('treats mismatched container kinds as unequal (array vs object vs scalar)', () => {
    expect(deepEqual([1], { 0: 1 })).toBe(false)
    expect(deepEqual({}, [])).toBe(false)
    expect(deepEqual({ a: 1 }, 1)).toBe(false)
    expect(deepEqual([1], 1)).toBe(false)
  })
})

describe('isPlainObject', () => {
  it('accepts plain objects only', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
  })

  it('rejects arrays, null, and primitives', () => {
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject(undefined)).toBe(false)
    expect(isPlainObject('x')).toBe(false)
    expect(isPlainObject(1)).toBe(false)
  })
})
