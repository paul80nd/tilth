import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getCommonNameOverrides, listTaxa, saveCommonName, type TaxonRef } from '../app/taxonNames'
import { familyCommon, genusCommon, pluralize, type CommonNameOverrides } from '../lib/taxonNames'

// Editor for the plain-language names of the botanical families/genera in the collection. These
// label the Taxonomy banners ("Rose family · Rosaceae") and the family gloss ("…strawberries,
// apples, roses and brambles"). Committed defaults show as the placeholder; a typed value is a
// user override (persisted in settings, travels in the backup); clearing a field falls back to
// the default. Genera also take an optional plural for the gloss — blank derives it.

/** One editable row. Local state holds the OVERRIDE (empty = use the committed default shown as
 *  placeholder); saved on blur. Setting a plural but no common pins the current default as the
 *  common, so the plural has something to attach to. */
function TaxonRow({ rank, sci, overrides, withPlural }: { rank: 'family' | 'genus'; sci: string; overrides: CommonNameOverrides; withPlural?: boolean }) {
  const bucket = rank === 'family' ? overrides.families : overrides.genera
  const ov = bucket?.[sci]
  const [common, setCommon] = useState(ov?.common ?? '')
  const [plural, setPlural] = useState(ov?.plural ?? '')

  const defaultCommon = rank === 'family' ? familyCommon(sci) : genusCommon(sci)
  const effectiveCommon = common.trim() || defaultCommon
  const isGap = !effectiveCommon

  function save() {
    const c = common.trim()
    const p = withPlural ? plural.trim() : undefined
    // A plural needs a common to hang on: if the common field is blank but a default exists, keep
    // it so overriding just the plural doesn't wipe the name.
    const nextCommon = c || (p ? (defaultCommon ?? '') : '')
    void saveCommonName(rank, sci, nextCommon, p)
  }

  return (
    <tr className="border-t border-divider">
      <td className="py-1 pr-3 align-middle">
        <span className="text-sm italic text-muted">{sci}</span>
        {isGap && <span className="ml-1.5 text-[0.65rem] text-subtle" title="No name yet — it shows as the bare scientific name">no name</span>}
      </td>
      <td className="py-1 pr-3">
        <input
          value={common}
          onChange={(e) => setCommon(e.target.value)}
          onBlur={save}
          placeholder={defaultCommon ?? 'Add a name'}
          aria-label={`Common name for ${sci}`}
          className="w-full rounded-md border border-line bg-card px-2 py-1 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none"
        />
      </td>
      {withPlural && (
        <td className="py-1">
          <input
            value={plural}
            onChange={(e) => setPlural(e.target.value)}
            onBlur={save}
            placeholder={effectiveCommon ? pluralize(effectiveCommon).toLowerCase() : '—'}
            aria-label={`Plural for ${sci}`}
            className="w-full rounded-md border border-line bg-card px-2 py-1 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none"
          />
        </td>
      )}
    </tr>
  )
}

function TaxonTable({ title, rows, overrides, withPlural }: { title: string; rows: TaxonRef[]; overrides: CommonNameOverrides; withPlural?: boolean }) {
  if (!rows.length) return null
  return (
    <div className="mt-4">
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      <table className="w-full table-fixed">
        <thead>
          <tr className="text-left text-[0.65rem] uppercase tracking-wide text-subtle">
            <th className="w-1/3 font-normal">Scientific</th>
            <th className="font-normal">Common name</th>
            {withPlural && <th className="w-1/3 font-normal">Plural</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <TaxonRow key={`${t.rank}:${t.sci}`} rank={t.rank} sci={t.sci} overrides={overrides} withPlural={withPlural} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CommonNamesEditor() {
  const taxa = useLiveQuery(listTaxa, [])
  const overrides = useLiveQuery(getCommonNameOverrides, []) ?? {}

  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <h2 className="font-medium">Common names</h2>
      <p className="mt-1 text-sm text-muted">
        Plain-language names for the botanical families and genera you grow — they label the Taxonomy
        banners and the family gloss (e.g. “Gourd family · Cucurbitaceae <em>(melons and squashes)</em>”).
        Leave a field blank to use the built-in default shown in grey. Genera take an optional plural
        for the gloss; blank derives it (melon → melons).
      </p>
      {!taxa ? (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      ) : !taxa.length ? (
        <p className="mt-3 text-sm text-muted">No families or genera in your collection yet.</p>
      ) : (
        <>
          <TaxonTable title="Genera" rows={taxa.filter((t) => t.rank === 'genus')} overrides={overrides} withPlural />
          <TaxonTable title="Families" rows={taxa.filter((t) => t.rank === 'family')} overrides={overrides} />
        </>
      )}
    </section>
  )
}
