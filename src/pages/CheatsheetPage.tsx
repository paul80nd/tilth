import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { PlantNode } from '../schema/plant'
import { getGuidesFor, getLineage } from '../app/plants'
import { botanicalLabel, displayLabel, displayName } from '../lib/naming'
import { resolveInherited } from '../lib/taxonomy'
import { seasonalInterest } from '../lib/calendar'
import AtAGlance from '../components/AtAGlance'
import CalendarBar from '../components/CalendarBar'
import ColourInterest from '../components/ColourInterest'
import SeasonStrip from '../components/SeasonStrip'
import Chip from '../components/Chip'

const CURRENT_MONTH = new Date().getMonth() + 1

export default function CheatsheetPage() {
  const { id = '' } = useParams()
  const data = useLiveQuery(async () => {
    const { node, ancestors } = await getLineage(id)
    if (!node) return { node: undefined, ancestors: [], guides: [] }
    const guides = await getGuidesFor(node, ancestors)
    return { node, ancestors, guides }
  }, [id])

  if (!data) return <p className="text-sm text-muted">Loading…</p>
  if (!data.node) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong bg-card p-8 text-center">
        <p className="text-sm text-muted">No plant found for "{id}".</p>
        <Link to="/" className="mt-2 inline-block text-sm font-medium text-brand-ink hover:underline">
          ← Back to Browse
        </Link>
      </div>
    )
  }

  const { node, ancestors, guides } = data
  const { node: resolved, inheritedFrom } = resolveInherited(node, ancestors)
  const { plant, variety } = displayName(node)
  const botanical = botanicalLabel(resolved)

  /** A muted "from {ancestor}" note when a field was inherited. */
  const inheritedNote = (field: keyof PlantNode): string | undefined => {
    const from = inheritedFrom[field]
    return from ? `from ${displayLabel(from)}` : undefined
  }

  // Seasonal interest strip (foliage/flower/fruit colour by season), derived from the
  // calendar's state phases + the flat colour fallback.
  const interest = seasonalInterest(resolved.calendar, resolved.colour)
  const hasInterest = interest.some((s) => s.parts.length > 0)

  // The at-a-glance panel spans two fields (conditions + size); note where they came from,
  // combining when both were inherited from the same ancestor.
  const glanceNote = ((): string | undefined => {
    const c = inheritedFrom.conditions ? displayLabel(inheritedFrom.conditions) : undefined
    const s = inheritedFrom.size ? displayLabel(inheritedFrom.size) : undefined
    if (c && s) return c === s ? `from ${c}` : `conditions from ${c} · size from ${s}`
    if (c) return `conditions from ${c}`
    if (s) return `size from ${s}`
    return undefined
  })()

  // Distinct sources contributing to this cheatsheet (own fields + inherited fields).
  const sources = new Set<string>()
  for (const fs of Object.values(node.provenance ?? {})) sources.add(fs.source)
  for (const [field, anc] of Object.entries(inheritedFrom)) {
    const fs = anc.provenance?.[field]
    if (fs) sources.add(fs.source)
  }

  return (
    <article className="flex flex-col gap-6">
      <Link to="/" className="text-sm font-medium text-muted hover:text-ink">
        ← Browse
      </Link>

      {/* header */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {resolved.category && <Chip tone="brand">{resolved.category}</Chip>}
          <Chip>{node.rank}</Chip>
          {resolved.lifecycle && <Chip>{resolved.lifecycle}</Chip>}
          {resolved.foliage && <Chip>{resolved.foliage}</Chip>}
          {resolved.habit && <Chip>{resolved.habit}</Chip>}
        </div>
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
          <div className="mt-1 flex flex-wrap gap-1.5">
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
      </header>

      {/* calendar + seasonal interest, side by side (≈60/40) when there's seasonal colour */}
      {hasInterest ? (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
          <Section title="Calendar" note={inheritedNote('calendar')}>
            <CalendarBar calendar={resolved.calendar!} month={CURRENT_MONTH} />
          </Section>
          <Section title="Seasonal interest" note={inheritedNote('calendar')}>
            <SeasonStrip interest={interest} />
          </Section>
        </div>
      ) : (
        <>
          <Section title="Calendar" note={inheritedNote('calendar')}>
            {resolved.calendar ? (
              <CalendarBar calendar={resolved.calendar} month={CURRENT_MONTH} />
            ) : (
              <Muted>No calendar recorded yet.</Muted>
            )}
          </Section>
          {resolved.colour && Object.values(resolved.colour).some((v) => v?.length) && (
            <Section title="Colour" note={inheritedNote('colour')}>
              <ColourInterest colour={resolved.colour} />
            </Section>
          )}
        </>
      )}

      {/* at a glance — the key-facts scan (conditions + ultimate size + edibility) */}
      <Section title="At a glance" note={glanceNote}>
        <AtAGlance
          conditions={resolved.conditions}
          size={resolved.size}
          edible={resolved.edible}
          toxicity={resolved.toxicity}
        />
      </Section>

      {/* more facts — the free seed-packet chips (spacing, germination, depth, use…) */}
      {resolved.facts && Object.keys(resolved.facts).length > 0 && (
        <Section title="More facts" note={inheritedNote('facts')}>
          <div className="flex flex-wrap gap-2">
            {Object.entries(resolved.facts).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-baseline gap-1.5 rounded-md bg-sunken px-2.5 py-1 text-sm"
              >
                <span className="text-xs uppercase tracking-wide text-subtle">{key}</span>
                <span className="font-medium">{value}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* wildlife & suggested uses */}
      {((resolved.wildlife?.length ?? 0) > 0 || (resolved.uses?.length ?? 0) > 0) && (
        <Section title="Wildlife & uses" note={inheritedNote('wildlife') ?? inheritedNote('uses')}>
          <div className="flex flex-col gap-2">
            {resolved.wildlife && resolved.wildlife.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {resolved.wildlife.map((w) => (
                  <Chip key={w} tone="brand">{w}</Chip>
                ))}
              </div>
            )}
            {resolved.uses && resolved.uses.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {resolved.uses.map((u) => (
                  <Chip key={u}>{u}</Chip>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* summary */}
      {resolved.summary && (
        <Section title="Notes" note={inheritedNote('summary')}>
          <p className="text-sm leading-relaxed text-muted">{resolved.summary}</p>
        </Section>
      )}

      {/* guides */}
      {guides.length > 0 && (
        <Section title="Guides">
          <ul className="flex flex-col gap-2">
            {guides.map((g) => (
              <li key={g.id} className="flex items-center gap-2">
                <Chip>{g.kind}</Chip>
                {g.url ? (
                  <a
                    href={g.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm font-medium text-brand-ink hover:underline"
                  >
                    {g.title} ↗
                  </a>
                ) : (
                  <span className="text-sm">{g.title}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* provenance */}
      {sources.size > 0 && (
        <footer className="border-t border-divider pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
            <span className="uppercase tracking-wide">Sources</span>
            {[...sources].map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        </footer>
      )}
    </article>
  )
}

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-h2 font-semibold">{title}</h2>
        {note && <span className="text-xs italic text-subtle">{note}</span>}
      </div>
      {children}
    </section>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>
}
