// Pure browse/faceting logic over the plant knowledge base. Browse is the WHOLE record of
// plants we hold (the reference collection); "My garden" (holdings) is a separate view. Cards
// cover the grow-able ranks you'd look up — species and cultivar — while family/genus become
// tags and filters. Kept pure so the toolbar/grid stay thin and this is unit-tested.

import type { Category, PlantNode, Rank } from '../schema/plant'
import { matchesQuery } from './naming'

/** Ranks that get a browse card. Family/genus/group are organising metadata, not cards. */
export const BROWSABLE_RANKS: Rank[] = ['species', 'cultivar']

export interface BrowseCriteria {
  query?: string
  category?: Category
  genus?: string
  family?: string
}

/** The nodes eligible to appear as cards. */
export function browsableNodes(nodes: PlantNode[]): PlantNode[] {
  return nodes.filter((n) => BROWSABLE_RANKS.includes(n.rank))
}

/** Apply search + facet filters to the browsable set, sorted by display label. */
export function filterNodes(nodes: PlantNode[], criteria: BrowseCriteria = {}): PlantNode[] {
  const { query = '', category, genus, family } = criteria
  return browsableNodes(nodes)
    .filter((n) => matchesQuery(n, query))
    .filter((n) => !category || n.category === category)
    .filter((n) => !genus || n.genus === genus)
    .filter((n) => !family || n.family === family)
    .sort((a, b) => label(a).localeCompare(label(b)))
}

function label(n: PlantNode): string {
  return `${n.commonName ?? n.botanicalName ?? n.id} ${n.variety ?? ''}`.trim()
}

/** Distinct, sorted category facet values present in the browsable set. */
export function categoriesOf(nodes: PlantNode[]): Category[] {
  return distinct(browsableNodes(nodes).map((n) => n.category)) as Category[]
}

export function generaOf(nodes: PlantNode[]): string[] {
  return distinct(browsableNodes(nodes).map((n) => n.genus))
}

export function familiesOf(nodes: PlantNode[]): string[] {
  return distinct(browsableNodes(nodes).map((n) => n.family))
}

function distinct(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b))
}
