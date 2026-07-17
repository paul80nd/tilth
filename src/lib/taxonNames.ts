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

/**
 * Label for a family/genus section-marker row: the scientific name, with a common-name gloss
 * in parentheses when we know one — "Liliaceae (Lily family)", "Allium (Onion genus)". Falls
 * back to the scientific name alone when there's no gloss, or when the gloss would just repeat
 * it (e.g. Dahlia). Non-banner ranks just get their scientific/common name.
 */
export function bannerLabel(node: PlantNode): string {
  const sci = node.botanicalName ?? (node.rank === 'family' ? node.family : node.genus) ?? node.commonName ?? node.id
  const map = node.rank === 'family' ? FAMILY_COMMON : node.rank === 'genus' ? GENUS_COMMON : undefined
  const common = map?.[sci]
  if (common && common.toLowerCase() !== sci.toLowerCase()) return `${sci} (${common} ${node.rank})`
  return sci
}
