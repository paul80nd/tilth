// Pure parsing of the free-form ultimate-size strings (database bands + seed-packet values) into
// numeric metre ranges, so the Size card can draw a plant to scale. Tolerant of "10-50cm", "60cm",
// "0.1-0.5m", "1.5m", "12m+", "0-0.1". Presentation keeps the original strings as labels — this is
// only the geometry. Pure, unit-tested, no I/O.

export interface MetreRange {
  /** Lower bound in metres. */
  min: number
  /** Upper (ultimate) bound in metres — equals min for a single value. */
  max: number
  /** "12m+" and the like — no firm upper bound. */
  openEnded: boolean
}

/** Parse a length string to a metre range, or undefined if there's no number in it. */
export function parseLength(input?: string): MetreRange | undefined {
  if (!input) return undefined
  const s = input.toLowerCase()
  const nums = s.match(/\d+(?:\.\d+)?/g)
  if (!nums) return undefined
  const scale = s.includes('cm') ? 0.01 : 1
  const vals = nums.map((n) => parseFloat(n) * scale)
  return { min: Math.min(...vals), max: Math.max(...vals), openEnded: s.includes('+') }
}
