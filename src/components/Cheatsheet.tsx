import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { PlantNode, Guide } from '../schema/plant'
import { getGuidesFor, getLineage } from '../app/plants'
import { botanicalLabel, displayLabel, displayName } from '../lib/naming'
import { resolveInherited } from '../lib/taxonomy'
import { nodeTags } from '../lib/tags'
import { seasonalInterest } from '../lib/calendar'
import { EdibilityFacts } from './KeyFacts'
import PositionCard from './PositionCard'
import SizeCard from './SizeCard'
import ConditionsCard from './ConditionsCard'
import CalendarBar from './CalendarBar'
import SeasonStrip from './SeasonStrip'
import { SeasonalInterestEditor } from './SeasonalInterestEditor'
import { PositionEditor } from './PositionEditor'
import { ConditionsEditor } from './ConditionsEditor'
import { SizeEditor } from './SizeEditor'
import { CalendarEditor } from './CalendarEditor'
import { EdibilityEditor } from './EdibilityEditor'
import { FactsEditor } from './FactsEditor'
import Chip from './Chip'

const CURRENT_MONTH = new Date().getMonth() + 1

export interface PlantDetail {
  node?: PlantNode
  ancestors: PlantNode[]
  guides: Guide[]
}

/** Live-load a plant's node, ancestor chain and aggregated guides — the data the cheatsheet
 *  renders. Shared by the full page and the Taxonomy modal so both stay in sync. */
export function usePlantDetail(id: string): PlantDetail | undefined {
  return useLiveQuery(async () => {
    const { node, ancestors } = await getLineage(id)
    if (!node) return { node: undefined, ancestors: [], guides: [] as Guide[] }
    const guides = await getGuidesFor(node, ancestors)
    return { node, ancestors, guides }
  }, [id])
}

/** The cheatsheet one-pager for a plant — the masthead (identity + calendar hero), the dense
 *  tile-grid of facets, and the sources footer. Chrome (back / edit / delete / close) lives with
 *  the caller (the page or the modal) so this stays purely presentational. */
export function CheatsheetContent({ node, ancestors, guides }: { node: PlantNode; ancestors: PlantNode[]; guides: Guide[] }) {
  const [editingCalendar, setEditingCalendar] = useState(false)
  const [editingSeasonal, setEditingSeasonal] = useState(false)
  const [editingPosition, setEditingPosition] = useState(false)
  const [editingConditions, setEditingConditions] = useState(false)
  const [editingSize, setEditingSize] = useState(false)
  const [editingEdibility, setEditingEdibility] = useState(false)
  const [editingFacts, setEditingFacts] = useState(false)
  const { node: resolved, inheritedFrom } = resolveInherited(node, ancestors)
  const { plant, variety } = displayName(node)
  const botanical = botanicalLabel(resolved)

  /** A muted "from {ancestor}" note when a field was inherited. */
  const inheritedNote = (field: keyof PlantNode): string | undefined => {
    const from = inheritedFrom[field]
    return from ? `from ${displayLabel(from)}` : undefined
  }

  const interest = seasonalInterest(resolved.seasonalInterest)
  const hasInterest = interest.some((s) => s.parts.length > 0)
  const hasFacts = !!resolved.facts && Object.keys(resolved.facts).length > 0
  const hasWildlife = (resolved.wildlife?.length ?? 0) > 0
  const hasUses = (resolved.uses?.length ?? 0) > 0

  // Distinct sources contributing to this cheatsheet (own fields + inherited fields).
  const sources = new Set<string>()
  for (const fs of Object.values(node.provenance ?? {})) sources.add(fs.source)
  for (const [field, anc] of Object.entries(inheritedFrom)) {
    const fs = anc.provenance?.[field]
    if (fs) sources.add(fs.source)
  }
  // The enrich-from link for each source (on this node or an ancestor), so a Sources tag can
  // double as the link to the page it came from.
  const sourceUrl = new Map<string, string>()
  for (const n of [node, ...ancestors]) {
    for (const l of n.sourceLinks ?? []) if (!sourceUrl.has(l.source)) sourceUrl.set(l.source, l.url)
  }

  return (
    <>
      {/* Masthead: identity (left) beside the Calendar hero (right). */}
      <div className="grid gap-6 lg:grid-cols-6 lg:items-start">
        <header className="flex flex-col gap-2 lg:col-span-2">
          <h1 className="font-display text-display font-semibold leading-tight">
            {plant}
            {variety && <span className="text-brand-ink"> · {variety}</span>}
          </h1>
          {botanical && (
            <p className="text-sm italic text-muted">
              {botanical}
              {resolved.synonyms && resolved.synonyms.length > 0 && (
                <span className="not-italic text-subtle"> · syn. {resolved.synonyms.join(', ')}</span>
              )}
            </p>
          )}
          {resolved.otherNames && resolved.otherNames.length > 0 && (
            <p className="text-xs text-subtle">also known as {resolved.otherNames.join(', ')}</p>
          )}
          {node.awards && node.awards.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {node.awards.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1 rounded-md bg-accent-tint px-2 py-0.5 text-xs font-semibold text-accent-ink"
                >
                  <span aria-hidden="true">★</span>
                  {a}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {nodeTags(resolved).map((t, i) => (
              <Chip key={i} tone={t.tone}>{t.label}</Chip>
            ))}
          </div>
        </header>

        <div className="lg:col-span-4">
          <Tile
            action={
              <button
                type="button"
                onClick={() => setEditingCalendar(true)}
                className="text-xs font-medium text-brand-ink hover:underline"
              >
                Edit
              </button>
            }
            bleed={!!resolved.calendar}
          >
            {resolved.calendar ? (
              <CalendarBar calendar={resolved.calendar} month={CURRENT_MONTH} note={inheritedNote('calendar')} />
            ) : (
              <Muted>No calendar recorded yet.</Muted>
            )}
          </Tile>
        </div>
      </div>

      {/* Everything else as one dense tile-grid. */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:[grid-auto-flow:dense]">
        <div className="lg:col-span-2">
          <Tile
            title="Seasonal interest"
            note={hasInterest ? inheritedNote('seasonalInterest') : undefined}
            action={
              <button
                type="button"
                onClick={() => setEditingSeasonal(true)}
                className="text-xs font-medium text-brand-ink hover:underline"
              >
                Edit
              </button>
            }
            fill
            bleed={hasInterest}
          >
            {hasInterest ? (
              <SeasonStrip interest={interest} />
            ) : (
              <Muted>No seasonal interest recorded yet.</Muted>
            )}
          </Tile>
        </div>

        <div className="lg:col-span-2">
          <Tile
            title="Position"
            note={inheritedNote('position')}
            action={
              <button
                type="button"
                onClick={() => setEditingPosition(true)}
                className="text-xs font-medium text-brand-ink hover:underline"
              >
                Edit
              </button>
            }
            fill
            bleed
          >
            <PositionCard position={resolved.position} />
          </Tile>
        </div>

        <div className="lg:col-span-2">
          <Tile
            title="Conditions"
            note={inheritedNote('conditions')}
            action={
              <button
                type="button"
                onClick={() => setEditingConditions(true)}
                className="text-xs font-medium text-brand-ink hover:underline"
              >
                Edit
              </button>
            }
            fill
            bleed
          >
            <ConditionsCard conditions={resolved.conditions} />
          </Tile>
        </div>

        <div className="lg:col-span-2 lg:row-span-2">
          <Tile
            title="Size"
            note={inheritedNote('size')}
            action={
              <button
                type="button"
                onClick={() => setEditingSize(true)}
                className="text-xs font-medium text-brand-ink hover:underline"
              >
                Edit
              </button>
            }
            fill
            bleed
          >
            <SizeCard size={resolved.size} />
          </Tile>
        </div>

        <div className="lg:col-span-2">
          <Tile
            title="Edibility"
            note={inheritedNote('edible') ?? inheritedNote('toxicity')}
            action={
              <button
                type="button"
                onClick={() => setEditingEdibility(true)}
                className="text-xs font-medium text-brand-ink hover:underline"
              >
                Edit
              </button>
            }
            fill
          >
            <EdibilityFacts edible={resolved.edible} toxicity={resolved.toxicity} />
          </Tile>
        </div>

        <div className="lg:col-span-2">
          <Tile
            title="Wildlife & uses"
            note={hasWildlife || hasUses ? inheritedNote('wildlife') ?? inheritedNote('uses') : undefined}
            fill
          >
            {hasWildlife || hasUses ? (
              <div className="flex flex-col gap-2">
                {hasWildlife && (
                  <div className="flex flex-wrap gap-1.5">
                    {resolved.wildlife!.map((w) => (
                      <Chip key={w} tone="brand">{w}</Chip>
                    ))}
                  </div>
                )}
                {hasUses && (
                  <div className="flex flex-wrap gap-1.5">
                    {resolved.uses!.map((u) => (
                      <Chip key={u}>{u}</Chip>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Muted>None recorded yet.</Muted>
            )}
          </Tile>
        </div>

        <div className="lg:col-span-2">
          <Tile
            title="More facts"
            note={hasFacts ? inheritedNote('facts') : undefined}
            action={
              <button
                type="button"
                onClick={() => setEditingFacts(true)}
                className="text-xs font-medium text-brand-ink hover:underline"
              >
                Edit
              </button>
            }
            fill
          >
            {hasFacts ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(resolved.facts!).map(([key, value]) => (
                  <span key={key} className="inline-flex items-baseline gap-1.5 rounded-md bg-sunken px-2.5 py-1 text-sm">
                    <span className="text-xs uppercase tracking-wide text-subtle">{key}</span>
                    <span className="font-medium">{value}</span>
                  </span>
                ))}
              </div>
            ) : (
              <Muted>None recorded yet.</Muted>
            )}
          </Tile>
        </div>

        <div className="lg:col-span-2">
          <Tile title="Notes" note={resolved.summary ? inheritedNote('summary') : undefined} fill>
            {resolved.summary ? (
              <p className="text-sm leading-relaxed text-muted">{resolved.summary}</p>
            ) : (
              <Muted>No notes yet.</Muted>
            )}
          </Tile>
        </div>

        <div className="sm:col-span-2 lg:col-span-6">
          <Tile title="Guides" fill>
            {guides.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {guides.map((g) => (
                  <li key={g.id} className="flex items-center gap-2">
                    <Chip>{g.kind}</Chip>
                    {g.url ? (
                      <a href={g.url} target="_blank" rel="noreferrer noopener" className="text-sm font-medium text-brand-ink hover:underline">
                        {g.title} ↗
                      </a>
                    ) : (
                      <span className="text-sm">{g.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Muted>No linked guides.</Muted>
            )}
          </Tile>
        </div>
      </div>

      {sources.size > 0 && (
        <footer className="border-t border-divider pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
            <span className="uppercase tracking-wide">Sources</span>
            {[...sources].map((s) => {
              const url = sourceUrl.get(s)
              return url ? (
                <a
                  key={s}
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={`Open the ${s} page this was enriched from`}
                  className="inline-flex items-center gap-0.5 rounded-md bg-sunken px-2 py-0.5 text-xs font-medium text-brand-ink hover:underline"
                >
                  {s} <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <Chip key={s}>{s}</Chip>
              )
            })}
          </div>
        </footer>
      )}

      {editingCalendar && (
        <CalendarEditor
          node={node}
          calendar={resolved.calendar}
          onClose={() => setEditingCalendar(false)}
        />
      )}

      {editingSeasonal && (
        <SeasonalInterestEditor
          node={node}
          initial={resolved.seasonalInterest}
          onClose={() => setEditingSeasonal(false)}
        />
      )}

      {editingPosition && (
        <PositionEditor
          node={node}
          position={resolved.position}
          onClose={() => setEditingPosition(false)}
        />
      )}

      {editingConditions && (
        <ConditionsEditor
          node={node}
          conditions={resolved.conditions}
          onClose={() => setEditingConditions(false)}
        />
      )}

      {editingSize && (
        <SizeEditor node={node} size={resolved.size} onClose={() => setEditingSize(false)} />
      )}

      {editingEdibility && (
        <EdibilityEditor
          node={node}
          edible={resolved.edible}
          toxicity={resolved.toxicity}
          onClose={() => setEditingEdibility(false)}
        />
      )}

      {editingFacts && (
        <FactsEditor node={node} facts={resolved.facts} onClose={() => setEditingFacts(false)} />
      )}
    </>
  )
}

// A dashboard tile: a quiet title *outside* a bordered card whose content bleeds to the border
// (`bleed={false}` re-adds a p-4 inset for text/chips). `fill` stretches it to the row height.
function Tile({
  title,
  note,
  action,
  bleed = false,
  fill,
  children,
}: {
  title?: string
  note?: string
  /** Optional control aligned to the right of the title row (e.g. an Edit button). */
  action?: React.ReactNode
  bleed?: boolean
  fill?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={`flex flex-col gap-2 ${fill ? 'h-full' : ''}`}>
      {(title || note || action) && (
        <div className="flex items-baseline gap-2">
          {title && <h2 className="font-display text-h3 font-semibold text-muted">{title}</h2>}
          {note && <span className="text-xs italic text-subtle">{note}</span>}
          {action && <div className="ml-auto self-center">{action}</div>}
        </div>
      )}
      <div className={`overflow-hidden rounded-lg border border-line bg-card ${fill ? 'flex-1' : ''} ${bleed ? '' : 'p-4'}`}>
        {children}
      </div>
    </section>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>
}
