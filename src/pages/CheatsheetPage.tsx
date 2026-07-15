import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { PlantNode } from '../schema/plant'
import { getGuidesFor, getLineage } from '../app/plants'
import { botanicalLabel, displayLabel, displayName } from '../lib/naming'
import { resolveInherited } from '../lib/taxonomy'
import { seasonalInterest } from '../lib/calendar'
import { PositionFacts, EdibilityFacts } from '../components/KeyFacts'
import SizeCard from '../components/SizeCard'
import ConditionsCard from '../components/ConditionsCard'
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
  const hasColour = !!resolved.colour && Object.values(resolved.colour).some((v) => v?.length)
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

      {/* The hero pairing: Calendar + Seasonal interest, side by side (70/30), evened to the
          same height. Titles sit outside each card; the card content bleeds to the border. */}
      <div className="grid gap-6 lg:grid-cols-[7fr_3fr] lg:items-stretch">
        <Tile
          title="Calendar"
          note={resolved.calendar ? inheritedNote('calendar') : undefined}
          fill
          bleed={!!resolved.calendar}
        >
          {resolved.calendar ? (
            <CalendarBar calendar={resolved.calendar} month={CURRENT_MONTH} />
          ) : (
            <Muted>No calendar recorded yet.</Muted>
          )}
        </Tile>

        {/* Seasonal colour: the season strip when the calendar carries state phases, the flat
            colour list when it only has colour, else a placeholder — one stable slot. */}
        {hasInterest ? (
          <Tile title="Seasonal interest" note={inheritedNote('calendar')} fill bleed>
            <SeasonStrip interest={interest} />
          </Tile>
        ) : hasColour ? (
          <Tile title="Colour" note={inheritedNote('colour')} fill>
            <ColourInterest colour={resolved.colour!} />
          </Tile>
        ) : (
          <Tile title="Seasonal interest" fill>
            <Muted>No seasonal colour recorded yet.</Muted>
          </Tile>
        )}
      </div>

      {/* Key facts as a row of three equal-width cards beneath the calendar: Position, Size,
          Conditions. They answer the same questions in the same place for every plant. */}
      <div className="grid gap-6 sm:grid-cols-[4fr_3fr_3fr] sm:items-start">
        <Tile title="Position" note={inheritedNote('conditions')}>
          <PositionFacts conditions={resolved.conditions} />
        </Tile>
        <Tile title="Size" note={inheritedNote('size')} bleed>
          <SizeCard size={resolved.size} />
        </Tile>
        <Tile title="Conditions" note={inheritedNote('conditions')} bleed>
          <ConditionsCard conditions={resolved.conditions} />
        </Tile>
      </div>

      {/* The rest of the cheatsheet as a CSS-columns masonry. Every tile always renders
          (placeholder when its data is absent) so positions stay familiar across plants. */}
      <div className="columns-1 gap-6 lg:columns-2">
        {/* Edibility — what's edible + any toxicity caution */}
        <Tile
          title="Edibility"
          note={inheritedNote('edible') ?? inheritedNote('toxicity')}
          masonry
        >
          <EdibilityFacts edible={resolved.edible} toxicity={resolved.toxicity} />
        </Tile>

        {/* More facts — the free seed-packet chips (spacing, germination, depth, use…) */}
        <Tile title="More facts" note={hasFacts ? inheritedNote('facts') : undefined} masonry>
          {hasFacts ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(resolved.facts!).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-baseline gap-1.5 rounded-md bg-sunken px-2.5 py-1 text-sm"
                >
                  <span className="text-xs uppercase tracking-wide text-subtle">{key}</span>
                  <span className="font-medium">{value}</span>
                </span>
              ))}
            </div>
          ) : (
            <Muted>None recorded yet.</Muted>
          )}
        </Tile>

        {/* Wildlife & suggested uses */}
        <Tile
          title="Wildlife & uses"
          note={hasWildlife || hasUses ? inheritedNote('wildlife') ?? inheritedNote('uses') : undefined}
          masonry
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

        {/* Notes */}
        <Tile title="Notes" note={resolved.summary ? inheritedNote('summary') : undefined} masonry>
          {resolved.summary ? (
            <p className="text-sm leading-relaxed text-muted">{resolved.summary}</p>
          ) : (
            <Muted>No notes yet.</Muted>
          )}
        </Tile>

        {/* Guides */}
        <Tile title="Guides" masonry>
          {guides.length > 0 ? (
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
          ) : (
            <Muted>No linked guides.</Muted>
          )}
        </Tile>
      </div>

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

// A dashboard tile: a quiet title *outside* a bordered card (the content draws the eye). The
// card carries no padding by default so visual content (calendar, season strip) bleeds to the
// border; `bleed={false}` re-adds a p-4 inset for text/chip content. `fill` stretches the card
// to its row height (the evened hero pairing); `masonry` adds the column-flow rhythm and stops a
// tile splitting across a column break.
function Tile({
  title,
  note,
  bleed = false,
  fill,
  masonry,
  children,
}: {
  title: string
  note?: string
  bleed?: boolean
  fill?: boolean
  masonry?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={`flex flex-col gap-2 ${fill ? 'h-full' : ''} ${
        masonry ? 'mb-6 break-inside-avoid' : ''
      }`}
    >
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-h3 font-semibold text-muted">{title}</h2>
        {note && <span className="text-xs italic text-subtle">{note}</span>}
      </div>
      <div
        className={`overflow-hidden rounded-lg border border-line bg-card ${fill ? 'flex-1' : ''} ${
          bleed ? '' : 'p-4'
        }`}
      >
        {children}
      </div>
    </section>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>
}
