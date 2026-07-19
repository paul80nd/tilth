// How a planting is colour-coded across the planner — on the plot canvas and in the bed's plant
// list. Colour is by botanical category. Pure (no IO); the hexes are placeholders behind a later
// brand pass, like the condition glyphs.

import type { PlantNode } from '../schema/plant'

/** Placeholder per-category fill — literal hexes swapped at brand time. */
export const CATEGORY_COLOR: Record<string, string> = {
  flower: '#c084fc',
  fruit: '#fb7185',
  herb: '#34d399',
  tree: '#60a5fa',
  veg: '#f59e0b',
}

/** Fallback for a node with no (or an unknown) category. */
export const DEFAULT_CATEGORY_COLOR = '#94a3b8'

/** The colour a plant reads as on the plot — its category colour, or the neutral default. */
export const categoryColor = (node?: Pick<PlantNode, 'category'>): string =>
  (node?.category && CATEGORY_COLOR[node.category]) || DEFAULT_CATEGORY_COLOR
