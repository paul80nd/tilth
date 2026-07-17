import { describe, it, expect } from 'vitest'
import { toSizeDraft, fromSizeDraft } from './sizeEdit'
import type { Size } from '../schema/plant'

describe('toSizeDraft', () => {
  it('reads a size into a full draft, blanks for absent fields', () => {
    expect(toSizeDraft({ height: '2-4m' })).toEqual({ height: '2-4m', spread: '', timeToSize: '' })
    expect(toSizeDraft(undefined)).toEqual({ height: '', spread: '', timeToSize: '' })
  })
})

describe('fromSizeDraft', () => {
  it('trims and omits blank fields', () => {
    expect(fromSizeDraft({ height: '  2-4m ', spread: '', timeToSize: '  ' })).toEqual({ height: '2-4m' })
  })

  it('collapses an all-blank draft to an empty size', () => {
    expect(fromSizeDraft({ height: '', spread: '', timeToSize: '' })).toEqual({})
  })

  it('round-trips a size unchanged', () => {
    const s: Size = { height: '0.1-0.5m', spread: '0.5m', timeToSize: '2-5 years' }
    expect(fromSizeDraft(toSizeDraft(s))).toEqual(s)
  })
})
