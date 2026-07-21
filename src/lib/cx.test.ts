import { describe, it, expect } from 'vitest'
import { cx } from './cx'

describe('cx', () => {
  it('joins truthy parts with single spaces', () => {
    expect(cx('a', 'b', 'c')).toBe('a b c')
  })

  it('drops falsy parts (false / null / undefined / empty string)', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b')
    expect(cx('base', true && 'on', false && 'off')).toBe('base on')
  })

  it('returns an empty string when nothing is truthy', () => {
    expect(cx(false, null, undefined)).toBe('')
  })
})
