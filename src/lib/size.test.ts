import { describe, it, expect } from 'vitest'
import { parseLength } from './size'

describe('parseLength', () => {
  it('reads centimetre ranges into metres', () => {
    expect(parseLength('10-50cm')).toEqual({ min: 0.1, max: 0.5, openEnded: false })
    expect(parseLength('60cm')).toEqual({ min: 0.6, max: 0.6, openEnded: false })
  })

  it('reads metre ranges and single values', () => {
    expect(parseLength('0.1-0.5m')).toEqual({ min: 0.1, max: 0.5, openEnded: false })
    expect(parseLength('1.5m')).toEqual({ min: 1.5, max: 1.5, openEnded: false })
    expect(parseLength('2.5-4m')).toEqual({ min: 2.5, max: 4, openEnded: false })
  })

  it('flags open-ended values', () => {
    expect(parseLength('12m+')).toEqual({ min: 12, max: 12, openEnded: true })
    expect(parseLength('1.8m+')).toEqual({ min: 1.8, max: 1.8, openEnded: true })
  })

  it('assumes metres when the unit is missing', () => {
    expect(parseLength('0-0.1')).toEqual({ min: 0, max: 0.1, openEnded: false })
  })

  it('is undefined for empty or numberless input', () => {
    expect(parseLength(undefined)).toBeUndefined()
    expect(parseLength('n/a')).toBeUndefined()
  })
})
