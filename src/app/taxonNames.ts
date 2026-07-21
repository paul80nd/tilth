// Application layer: the gardener's overrides for the family/genus common-name vocabulary — the
// seam the Data-page editor and the Gherkin tests both drive. The committed maps in
// src/lib/taxonNames.ts stay the defaults (firewall-safe generic taxonomy, and the demo needs
// them); this only persists the additions/edits on top, in one `settings` record, so they travel
// in the backup and never touch the committed code. Pure lookup/merge lives in the lib; this
// module just reads/writes Dexie and marks the store user-owned.

import { db } from '../db/db'
import { markUser } from './dataSource'
import type { CommonNameEntry, CommonNameOverrides } from '../lib/taxonNames'

const KEY = 'taxonNames'

/** The gardener's common-name overrides (empty object when none saved yet). */
export async function getCommonNameOverrides(): Promise<CommonNameOverrides> {
  const s = await db.settings.get(KEY)
  return (s?.value ?? {}) as CommonNameOverrides
}

/** A family/genus present in the collection, for the editor to list — its scientific name plus the
 *  gardener's current override (if any). Deduped + sorted by scientific name. */
export interface TaxonRef {
  rank: 'family' | 'genus'
  sci: string
}

/** The distinct families + genera present in the collection (rank family/genus nodes), so the
 *  editor lists exactly the ones worth naming — and surfaces the ones with no name yet. */
export async function listTaxa(): Promise<TaxonRef[]> {
  const nodes = await db.nodes.where('rank').anyOf('family', 'genus').toArray()
  const seen = new Set<string>()
  const out: TaxonRef[] = []
  for (const n of nodes) {
    const rank = n.rank as 'family' | 'genus'
    const sci = n.botanicalName ?? (rank === 'family' ? n.family : n.genus) ?? n.id
    const key = `${rank}:${sci}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ rank, sci })
  }
  return out.sort((a, b) => a.sci.localeCompare(b.sci))
}

/**
 * Set (or clear) the override for one family/genus. An empty `common` removes the entry entirely
 * (falling back to the committed default); a blank `plural` is dropped (the gloss derives it).
 * Genera keep an optional plural; families ignore it (family names aren't pluralised).
 */
export async function saveCommonName(
  rank: 'family' | 'genus',
  sci: string,
  common: string,
  plural?: string,
): Promise<void> {
  const bucket = rank === 'family' ? 'families' : 'genera'
  await db.transaction('rw', db.settings, async () => {
    const cur = await getCommonNameOverrides()
    const map: Record<string, CommonNameEntry> = { ...(cur[bucket] ?? {}) }
    const c = common.trim()
    const p = rank === 'genus' ? plural?.trim() : undefined
    if (!c) {
      delete map[sci]
    } else {
      map[sci] = p ? { common: c, plural: p } : { common: c }
    }
    const next: CommonNameOverrides = { ...cur, [bucket]: map }
    await db.settings.put({ key: KEY, value: next })
    await markUser()
  })
}
