import { describe, it, expect } from 'vitest'
import { colourSwatch } from './colour'

describe('colourSwatch', () => {
  it('maps a plain colour word to a swatch', () => {
    expect(colourSwatch('red')).toBeTruthy()
    expect(colourSwatch('YELLOW')).toBe(colourSwatch('yellow'))
  })

  it('matches a colour word inside a phrase', () => {
    expect(colourSwatch('deep pink')).toBe(colourSwatch('pink'))
    expect(colourSwatch('golden yellow')).toBeTruthy()
  })

  it('returns undefined for an unrecognised colour', () => {
    expect(colourSwatch('chartreuse-ish nonsense')).toBeUndefined()
  })
})
