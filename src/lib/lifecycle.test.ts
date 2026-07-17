import { describe, expect, it } from 'vitest'
import { asLifecycle, lifecycleLabel } from './lifecycle'

describe('asLifecycle', () => {
  it('keeps a valid code array, in canonical order and de-duplicated', () => {
    expect(asLifecycle(['perennial', 'annual', 'annual'])).toEqual(['annual', 'perennial'])
  })

  it('coerces a bare legacy string to a one-element array', () => {
    expect(asLifecycle('annual')).toEqual(['annual'])
  })

  it('is forgiving about case and whitespace', () => {
    expect(asLifecycle(['  Biennial ', 'PERENNIAL'])).toEqual(['biennial', 'perennial'])
  })

  it('drops unknown entries', () => {
    expect(asLifecycle(['annual', 'monocarpic'])).toEqual(['annual'])
  })

  it('returns undefined when nothing valid remains, preserving "absent"', () => {
    expect(asLifecycle(undefined)).toBeUndefined()
    expect(asLifecycle([])).toBeUndefined()
    expect(asLifecycle(['nonsense'])).toBeUndefined()
    expect(asLifecycle(42)).toBeUndefined()
  })
})

describe('lifecycleLabel', () => {
  it('title-cases known codes', () => {
    expect(lifecycleLabel('annual')).toBe('Annual')
    expect(lifecycleLabel('perennial')).toBe('Perennial')
  })
})
