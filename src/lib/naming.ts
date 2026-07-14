// Pure display-naming helpers. Browse and the cheatsheet lead with what you *call* a plant
// — the common name + variety, as in the gardener's spreadsheet — while botanical
// genus/family are secondary (a tag / filter). Kept pure so it's unit-tested and shared.

import type { PlantNode } from '../schema/plant'

export interface DisplayName {
  /** The plant's common name, e.g. "Tomato". Falls back to botanical/id if absent. */
  plant: string
  /** The cultivar/variety, e.g. "Sunny Bench". Absent above cultivar rank. */
  variety?: string
}

/** Variety-forward name parts for a card/heading. */
export function displayName(node: PlantNode): DisplayName {
  const plant = node.commonName ?? node.botanicalName ?? node.id
  return node.variety ? { plant, variety: node.variety } : { plant }
}

/** A single-line label, e.g. "Tomato · Sunny Bench" or "Basil". */
export function displayLabel(node: PlantNode): string {
  const { plant, variety } = displayName(node)
  return variety ? `${plant} · ${variety}` : plant
}

/** The botanical sub-label shown small under the name, e.g. "Solanum lycopersicum". */
export function botanicalLabel(node: PlantNode): string | undefined {
  return node.botanicalName
}

/** The genus/family tag shown on a browse card — genus preferred, family as fallback. */
export function taxonTag(node: PlantNode): string | undefined {
  return node.genus ?? node.family
}

/** Case-insensitive match of a free-text query against a node's names (common, variety,
 *  botanical, genus, family). Empty query matches everything. */
export function matchesQuery(node: PlantNode, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [
    node.commonName,
    node.variety,
    node.botanicalName,
    node.genus,
    node.family,
  ]
  return hay.some((s) => s?.toLowerCase().includes(q))
}
