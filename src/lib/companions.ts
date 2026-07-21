// Pure companion-planting engine + its ruleset. Some plants grow better next to certain others
// (a scent that masks a pest, a legume feeding a hungry neighbour) and some check each other; the
// planner flags both for the plants sharing a bed.
//
// FIREWALL: companion relationships are generic, widely-published horticultural knowledge — like
// the botanical taxonomy and the phase/condition vocabularies, they are OUR OWN data, authored in
// our own words here, naming no source and copying no proprietary chart. Rules are keyed to the
// taxonomy (family / genus / category) and resolved with the same own-or-inherited roll-up the
// rotation + jobs engines use, so a rule on `genus: 'Allium'` reaches every onion/leek/garlic
// cultivar you hold and de-dupes to one pairing.
//
// Pure: no Dexie, no I/O. The garden page fetches the tables and calls in (like rotation.ts).

import type { Category, PlantNode } from '../schema/plant'
import type { Holding } from '../schema/userData'
import { resolveUp } from './taxonomy'

/** One end of a companion rule — a taxon the rule applies to, matched by a plant's own-or-inherited
 *  botanical name (species) / genus / family / category. `species` matters where a genus spans crops
 *  with different behaviour — e.g. potato vs tomato are both *Solanum*, so a potato-only rule must
 *  key on `{ species: 'Solanum tuberosum' }`, not `{ genus: 'Solanum' }` (which would snag tomatoes). */
export type TaxonKey =
  | { species: string }
  | { genus: string }
  | { family: string }
  | { category: Category }

/** A companion relationship between two taxa. Symmetric — stored once, applies both ways. `note`
 *  is our own plain-language gloss (generic knowledge; never sourced text). */
export interface CompanionRule {
  a: TaxonKey
  b: TaxonKey
  relation: 'good' | 'bad'
  note?: string
}

/**
 * The committed generic ruleset — classic companion pairings at the crop-group level. Curated,
 * conservative, and in our own words (see the FIREWALL note above). Extend as the collection grows.
 */
export const COMPANION_RULES: CompanionRule[] = [
  // --- Good together ---
  { relation: 'good', a: { genus: 'Allium' }, b: { genus: 'Daucus' }, note: 'Onions and carrots guard each other — each masks the scent the other’s root fly hunts by.' },
  { relation: 'good', a: { family: 'Solanaceae' }, b: { genus: 'Ocimum' }, note: 'Basil is the classic tomato partner — said to lift its vigour and put off whitefly and aphids.' },
  { relation: 'good', a: { family: 'Fabaceae' }, b: { family: 'Brassicaceae' }, note: 'Peas and beans fix nitrogen in the soil that leafy brassicas feed on heavily.' },
  { relation: 'good', a: { genus: 'Tagetes' }, b: { family: 'Solanaceae' }, note: 'French marigolds help protect tomatoes and potatoes — their scent deters whitefly, their roots suppress nematodes.' },
  { relation: 'good', a: { genus: 'Tagetes' }, b: { family: 'Cucurbitaceae' }, note: 'Marigolds among squash and courgettes deter aphids and other pests.' },
  { relation: 'good', a: { genus: 'Tropaeolum' }, b: { family: 'Cucurbitaceae' }, note: 'Nasturtiums act as a trap crop, drawing aphids and blackfly off squash and cucumbers.' },
  { relation: 'good', a: { genus: 'Tropaeolum' }, b: { family: 'Brassicaceae' }, note: 'Nasturtiums lure caterpillars and aphids away from cabbages and their kin.' },
  { relation: 'good', a: { family: 'Fabaceae' }, b: { genus: 'Zea' }, note: 'Beans climb sweetcorn and feed it nitrogen — two of the “three sisters”.' },
  { relation: 'good', a: { genus: 'Cucurbita' }, b: { genus: 'Zea' }, note: 'Sprawling squash shades the soil around sweetcorn, keeping it moist and weed-free — the third “sister”.' },
  { relation: 'good', a: { genus: 'Allium' }, b: { family: 'Brassicaceae' }, note: 'Onions and garlic among brassicas help mask them from cabbage pests.' },
  { relation: 'good', a: { genus: 'Allium' }, b: { genus: 'Fragaria' }, note: 'A ring of onions or garlic helps keep pests and mould off strawberries.' },
  { relation: 'good', a: { genus: 'Beta' }, b: { family: 'Brassicaceae' }, note: 'Beetroot and chard sit happily alongside brassicas without competing.' },
  { relation: 'good', a: { genus: 'Lactuca' }, b: { genus: 'Daucus' }, note: 'Quick lettuces make a good catch crop between slow carrot rows.' },

  // --- Keep apart ---
  { relation: 'bad', a: { genus: 'Allium' }, b: { family: 'Fabaceae' }, note: 'Onions, garlic and their kin stunt peas and beans — keep alliums and legumes apart.' },
  { relation: 'bad', a: { genus: 'Foeniculum' }, b: { family: 'Solanaceae' }, note: 'Fennel discourages most neighbours — keep it away from tomatoes and potatoes.' },
  { relation: 'bad', a: { genus: 'Foeniculum' }, b: { family: 'Fabaceae' }, note: 'Fennel checks the growth of beans and peas — give it its own corner.' },
  { relation: 'bad', a: { genus: 'Foeniculum' }, b: { genus: 'Daucus' }, note: 'Fennel and carrots are close cousins that cross and compete — separate them.' },
  { relation: 'bad', a: { family: 'Brassicaceae' }, b: { genus: 'Fragaria' }, note: 'Brassicas and strawberries make poor bedfellows — best kept apart.' },
  // Potato-specific (species, not genus Solanum) so it never snags tomatoes/aubergines.
  { relation: 'bad', a: { species: 'Solanum tuberosum' }, b: { species: 'Solanum lycopersicum' }, note: 'Potatoes and tomatoes fall to the same blight — side by side, one readily infects the other. Keep them apart.' },
  { relation: 'bad', a: { species: 'Solanum tuberosum' }, b: { family: 'Cucurbitaceae' }, note: 'Potatoes and sprawling squash or cucumbers crowd each other and compete for the same ground — give them separate beds.' },
]

/** A companion relationship found among the plants sharing a bed — the two sides carry the distinct
 *  node ids that matched, so the caller can name them. */
export interface CompanionPairing {
  relation: 'good' | 'bad'
  note?: string
  /** Distinct held nodes in the bed matching side a of the rule (and, resp., side b). */
  aNodeIds: string[]
  bNodeIds: string[]
}

/** A bed's companion picture for a year — the good/bad pairings present among what shares it. */
export interface BedCompanions {
  bedId: string
  pairings: CompanionPairing[]
}

/** A display-ready line (names resolved) — built by the UI from a {@link CompanionPairing}. */
export interface CompanionLine {
  relation: 'good' | 'bad'
  a: string
  b: string
  note?: string
}

export interface CompanionOptions {
  /** The year an absent `holding.year` counts as (the schema's "absent = current"). */
  currentYear: number
}

/** A plant's resolved taxonomy, for rule matching. `species` is the resolved botanical name
 *  (binomial), which a cultivar inherits from its species. */
interface Taxon {
  species?: string
  genus?: string
  family?: string
  category?: Category
}

function matchesKey(key: TaxonKey, t: Taxon): boolean {
  if ('species' in key) return t.species === key.species
  if ('genus' in key) return t.genus === key.genus
  if ('family' in key) return t.family === key.family
  return t.category === key.category
}

/** Bad ⇒ good, so the more urgent pairings sort first; then a stable node-id order. */
function comparePairings(a: CompanionPairing, b: CompanionPairing): number {
  if (a.relation !== b.relation) return a.relation === 'bad' ? -1 : 1
  return (a.aNodeIds[0] ?? '').localeCompare(b.aNodeIds[0] ?? '') || (a.bNodeIds[0] ?? '').localeCompare(b.bNodeIds[0] ?? '')
}

/**
 * Find the companion pairings present in each bed for `year` — every rule whose two sides are both
 * met by *distinct* plants sharing that bed. Only same-bed proximity counts (MVP). A plant with an
 * unknown family/genus/category simply matches fewer rules; a bed with no pairing is omitted.
 */
export function companionsForYear(
  holdings: Holding[],
  nodesById: Map<string, PlantNode>,
  year: number,
  options: CompanionOptions,
): BedCompanions[] {
  const { currentYear } = options

  // This year's placements grouped by bed, each with its resolved taxonomy.
  const byBed = new Map<string, Array<{ holding: Holding; taxon: Taxon }>>()
  for (const h of holdings) {
    if (!h.bedId || (h.year ?? currentYear) !== year) continue
    const taxon: Taxon = {
      species: resolveUp(h.nodeId, nodesById, 'botanicalName'),
      genus: resolveUp(h.nodeId, nodesById, 'genus'),
      family: resolveUp(h.nodeId, nodesById, 'family'),
      category: resolveUp(h.nodeId, nodesById, 'category'),
    }
    const arr = byBed.get(h.bedId)
    if (arr) arr.push({ holding: h, taxon })
    else byBed.set(h.bedId, [{ holding: h, taxon }])
  }

  const result: BedCompanions[] = []
  for (const [bedId, plants] of byBed) {
    const pairings: CompanionPairing[] = []
    for (const rule of COMPANION_RULES) {
      const aMatch = plants.filter((p) => matchesKey(rule.a, p.taxon))
      const bMatch = plants.filter((p) => matchesKey(rule.b, p.taxon))
      // The pairing exists only if two DISTINCT plantings meet the two sides (a plant that happens
      // to match both sides doesn't pair with itself).
      const hasPair = aMatch.some((pa) => bMatch.some((pb) => pa.holding.id !== pb.holding.id))
      if (!hasPair) continue
      pairings.push({
        relation: rule.relation,
        note: rule.note,
        aNodeIds: [...new Set(aMatch.map((p) => p.holding.nodeId))].sort(),
        bNodeIds: [...new Set(bMatch.map((p) => p.holding.nodeId))].sort(),
      })
    }
    if (pairings.length) {
      pairings.sort(comparePairings)
      result.push({ bedId, pairings })
    }
  }
  result.sort((a, b) => a.bedId.localeCompare(b.bedId))
  return result
}

/** The bed ids with at least one *bad* companion pairing — the plot's companion-clash set. */
export function badCompanionBedIds(list: BedCompanions[]): Set<string> {
  return new Set(list.filter((c) => c.pairings.some((p) => p.relation === 'bad')).map((c) => c.bedId))
}
