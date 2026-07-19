// Common names for botanical families and genera, so a section-marker row can read
// "Liliaceae (Lily family)" / "Allium (Onion genus)" — the scientific name kept, with a
// plain-language gloss in parentheses. Generic botanical knowledge (public per the firewall):
// this names no source and is not scraped data. Bare common words; the rank word ("family"/
// "genus") is appended by `bannerLabel`. Extend as the collection grows.

import type { PlantNode } from '../schema/plant'

const FAMILY_COMMON: Record<string, string> = {
  Amaranthaceae: 'Amaranth',
  Amaryllidaceae: 'Amaryllis',
  Apiaceae: 'Carrot',
  Asteraceae: 'Daisy',
  Betulaceae: 'Birch',
  Boraginaceae: 'Borage',
  Brassicaceae: 'Cabbage',
  Caryophyllaceae: 'Pink',
  Cucurbitaceae: 'Gourd',
  Fabaceae: 'Pea',
  Grossulariaceae: 'Gooseberry',
  Lamiaceae: 'Mint',
  Lauraceae: 'Laurel',
  Liliaceae: 'Lily',
  Oleaceae: 'Olive',
  Onagraceae: 'Willowherb',
  Orobanchaceae: 'Broomrape',
  Ranunculaceae: 'Buttercup',
  Rosaceae: 'Rose',
  Scrophulariaceae: 'Figwort',
  Solanaceae: 'Nightshade',
  Tropaeolaceae: 'Nasturtium',
  Viburnaceae: 'Moschatel',
}

const GENUS_COMMON: Record<string, string> = {
  Allium: 'Onion',
  Artemisia: 'Wormwood',
  Beta: 'Beet',
  Betula: 'Birch',
  Borago: 'Borage',
  Brassica: 'Cabbage',
  Capsicum: 'Pepper',
  Centaurea: 'Knapweed',
  Chamaemelum: 'Chamomile',
  Cucumis: 'Melon',
  Cucurbita: 'Squash',
  Daucus: 'Carrot',
  Delphinium: 'Larkspur',
  Dianthus: 'Pink',
  Eruca: 'Rocket',
  Fragaria: 'Strawberry',
  Helianthus: 'Sunflower',
  Helichrysum: 'Strawflower',
  Lactuca: 'Lettuce',
  Lavandula: 'Lavender',
  Lotus: 'Trefoil',
  Malus: 'Apple',
  Melissa: 'Balm',
  Mentha: 'Mint',
  Narcissus: 'Daffodil',
  Ocimum: 'Basil',
  Olea: 'Olive',
  Persea: 'Avocado',
  Phaseolus: 'Bean',
  Pisum: 'Pea',
  Raphanus: 'Radish',
  Rhinanthus: 'Rattle',
  Ribes: 'Currant',
  Rosa: 'Rose',
  Rubus: 'Bramble',
  Salvia: 'Sage',
  Solanum: 'Nightshade',
  Tagetes: 'Marigold',
  Thymus: 'Thyme',
  Tropaeolum: 'Nasturtium',
  Tulipa: 'Tulip',
}

/** A user-set common name for a family or genus, overlaying the committed defaults above. `plural`
 *  is optional (genera only, for the family gloss) — omit it and it's derived by {@link pluralize}. */
export interface CommonNameEntry {
  common: string
  plural?: string
}

/** The gardener's overrides for the committed common-name maps, editable on the Data page and
 *  persisted in settings. Keyed by the *scientific* name (e.g. "Rosaceae", "Fragaria"). An entry
 *  overrides the default; a scientific name with no default here gains a name it never had. Keeping
 *  the committed maps as defaults means the demo + firewall-safe generic taxonomy stay in code and
 *  overrides are purely additive. See docs/decisions.md. */
export interface CommonNameOverrides {
  families?: Record<string, CommonNameEntry>
  genera?: Record<string, CommonNameEntry>
}

/** Effective common name for a family scientific name — a user override wins over the default. */
export function familyCommon(sci: string, overrides?: CommonNameOverrides): string | undefined {
  return overrides?.families?.[sci]?.common ?? FAMILY_COMMON[sci]
}

/** Effective common name for a genus scientific name — a user override wins over the default. */
export function genusCommon(sci: string, overrides?: CommonNameOverrides): string | undefined {
  return overrides?.genera?.[sci]?.common ?? GENUS_COMMON[sci]
}

/** Effective plural of a genus's common name — an explicit override wins, else the singular is
 *  pluralised. Undefined when the genus has no common name at all. */
export function genusPlural(sci: string, overrides?: CommonNameOverrides): string | undefined {
  const explicit = overrides?.genera?.[sci]?.plural
  if (explicit) return explicit
  const common = genusCommon(sci, overrides)
  return common ? pluralize(common) : undefined
}

/** Naive English pluraliser — enough for these common names (all regular): +es after a sibilant
 *  (bush→bushes, squash→squashes, birch→birches), consonant + y → -ies (strawberry→strawberries),
 *  otherwise +s. Kept simple on purpose; an irregular is handled by an explicit `plural` override. */
export function pluralize(word: string): string {
  if (/(s|x|z|ch|sh)$/i.test(word)) return word + 'es'
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies'
  return word + 's'
}

/** Join words as a natural list: "a", "a and b", "a, b and c" (no Oxford comma). */
function listAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * A parenthetical gloss for a family banner — the pluralised common names of the child genera
 * that have one, e.g. ["Cucumis", "Cucurbita"] → "melons and squashes". Genera with no known
 * common name are skipped (the gloss illustrates what the family includes, it isn't exhaustive),
 * and the input order is kept (the tree already sorts the genera). Lowercased so it reads as an
 * aside after the banner label. Returns undefined when none of the genera are named. The caller
 * wraps it in parentheses.
 */
export function genusGloss(genusSciNames: string[], overrides?: CommonNameOverrides): string | undefined {
  const seen = new Set<string>()
  const names: string[] = []
  for (const sci of genusSciNames) {
    const plural = genusPlural(sci, overrides)?.toLowerCase()
    if (!plural || seen.has(plural)) continue
    seen.add(plural)
    names.push(plural)
  }
  return names.length ? listAnd(names) : undefined
}

export interface BannerParts {
  /** The friendly primary label, e.g. "Onion genus" — shown first, prominent. */
  primary: string
  /** The scientific name, e.g. "Allium" — shown after, muted. Absent when there's no gloss. */
  secondary?: string
}

/**
 * Parts for a family/genus section-marker label: the common name leads ("Onion genus"), with
 * the scientific name kept as a muted trailer ("Allium"). Falls back to the scientific name
 * alone as `primary` when there's no gloss, or when the gloss would just repeat it (e.g.
 * Dahlia). The UI renders `primary · secondary` with `secondary` muted.
 */
export function bannerParts(node: PlantNode, overrides?: CommonNameOverrides): BannerParts {
  const sci = node.botanicalName ?? (node.rank === 'family' ? node.family : node.genus) ?? node.commonName ?? node.id
  const common = node.rank === 'family' ? familyCommon(sci, overrides) : node.rank === 'genus' ? genusCommon(sci, overrides) : undefined
  if (common && common.toLowerCase() !== sci.toLowerCase()) return { primary: `${common} ${node.rank}`, secondary: sci }
  return { primary: sci }
}
