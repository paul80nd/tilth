import { describe, it, expect } from 'vitest'
import { capitalize } from './text'

describe('capitalize', () => {
  it('upper-cases the first character only', () => {
    expect(capitalize('full sun')).toBe('Full sun')
    expect(capitalize('veg')).toBe('Veg')
  })

  it('leaves an empty string and an already-capital word unchanged', () => {
    expect(capitalize('')).toBe('')
    expect(capitalize('Apple')).toBe('Apple')
  })
})
