// Pure geometry for the garden-planner plot canvas — snapping, clamping, overlap, grid cells. Keeps
// the SVG canvas component dumb: it renders and reports pointer positions in metres, these helpers
// do the maths. No Dexie/IO. See docs/garden-planner-spec.md.

/** A rectangle in metres. Structurally matches `Rect` in the schema and `Region` in spacing.ts. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Round a value to the nearest multiple of `step` (a no-op when step ≤ 0). The result is
 *  cleaned to micrometre precision so snapped geometry doesn't accumulate float artefacts
 *  (e.g. `0.30000000000000004`) in stored beds/placements. */
export function snap(value: number, step: number): number {
  if (step <= 0) return value
  return Math.round((Math.round(value / step) * step) * 1e6) / 1e6
}

/** Snap a rect's position and size to a grid `step`, keeping at least one step of width/height so
 *  a bed/placement never collapses to zero. */
export function snapRect(rect: Rect, step: number): Rect {
  if (step <= 0) return rect
  return {
    x: snap(rect.x, step),
    y: snap(rect.y, step),
    width: Math.max(step, snap(rect.width, step)),
    height: Math.max(step, snap(rect.height, step)),
  }
}

/** Clamp a rect to sit fully within a container of the given size (origin 0,0). Shrinks an
 *  oversized rect to fit, then nudges it inside the bounds. */
export function clampRect(rect: Rect, containerW: number, containerH: number): Rect {
  const width = Math.min(rect.width, containerW)
  const height = Math.min(rect.height, containerH)
  const x = Math.min(Math.max(0, rect.x), containerW - width)
  const y = Math.min(Math.max(0, rect.y), containerH - height)
  return { x, y, width, height }
}

/** Do two rects overlap? Edge-touching (shared border, zero area of overlap) is NOT an overlap, so
 *  beds/placements can sit flush. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

/** Whole grid cells that span a length (rounded to the nearest cell), at least one. */
export function cellsAcross(lengthM: number, cellM: number): number {
  if (cellM <= 0) return 0
  return Math.max(1, Math.round(lengthM / cellM))
}

/** Which corner of the plot stays put when it is resized. Space is added/removed on the two
 *  opposite sides, so beds keep their distance from the anchored corner. `NW` (the origin corner)
 *  is the natural default — beds don't move and the plot grows to the right and down. */
export type PlotAnchor = 'NW' | 'NE' | 'SW' | 'SE'

/** Reposition rects when their container is resized from a fixed `anchor` corner, then clamp each
 *  inside the new bounds. Anchoring an east corner shifts rects by the width delta (so the right
 *  edge stays put); a south corner shifts them by the height delta. A shrink can push a rect past
 *  the new edge — the clamp pulls it back in. */
export function reanchorRects(
  rects: Rect[],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
  anchor: PlotAnchor,
): Rect[] {
  const dx = anchor === 'NE' || anchor === 'SE' ? newW - oldW : 0
  const dy = anchor === 'SW' || anchor === 'SE' ? newH - oldH : 0
  return rects.map((r) => clampRect({ x: r.x + dx, y: r.y + dy, width: r.width, height: r.height }, newW, newH))
}
