import { describe, it, expect } from 'vitest'
import { categoryColor, CATEGORY_COLOR, DEFAULT_CATEGORY_COLOR } from './plantColor'

describe('categoryColor', () => {
  it('returns the category colour for a known category', () => {
    expect(categoryColor({ category: 'veg' })).toBe(CATEGORY_COLOR.veg)
  })
  it('falls back to the default for an unknown or missing category', () => {
    expect(categoryColor({ category: 'mushroom' as never })).toBe(DEFAULT_CATEGORY_COLOR)
    expect(categoryColor({})).toBe(DEFAULT_CATEGORY_COLOR)
    expect(categoryColor(undefined)).toBe(DEFAULT_CATEGORY_COLOR)
  })
})
