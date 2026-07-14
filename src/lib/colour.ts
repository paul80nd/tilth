// Map a free-text ornamental colour word to a small swatch colour, so the cheatsheet can show
// a dot next to "red" / "golden yellow". Best-effort and forgiving: multi-word values ("deep
// pink") match on any recognised colour word; unknown values just render without a swatch.
// Pure + dependency-free. These are generic colour names, not stored calendar colours.

const SWATCHES: Record<string, string> = {
  white: '#ffffff',
  cream: '#f5eecf',
  yellow: '#f4c430',
  gold: '#e6b422',
  golden: '#e6b422',
  orange: '#e8853a',
  apricot: '#f4a460',
  salmon: '#f08a70',
  red: '#c0392b',
  scarlet: '#d13b2a',
  crimson: '#b01030',
  pink: '#e08aa8',
  rose: '#d16a86',
  magenta: '#c0398a',
  purple: '#8e5aa8',
  violet: '#8a63c0',
  lilac: '#c3a6de',
  lavender: '#b9a7d8',
  mauve: '#b087a8',
  maroon: '#7a2230',
  blue: '#4a72b8',
  green: '#5a8f4a',
  lime: '#9bbf46',
  bronze: '#9c6b3f',
  brown: '#7a5230',
  silver: '#c8cdd0',
  grey: '#9aa0a4',
  gray: '#9aa0a4',
  black: '#2a2a2a',
  variegated: '#8fbf6a',
}

/** The swatch hex for a colour word (or a phrase containing one), else undefined. */
export function colourSwatch(name: string): string | undefined {
  const words = name.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  for (const w of words) {
    if (SWATCHES[w]) return SWATCHES[w]
  }
  return undefined
}
