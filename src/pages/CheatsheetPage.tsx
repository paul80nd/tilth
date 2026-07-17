import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { PlantNode } from '../schema/plant'
import { getGuidesFor, getLineage } from '../app/plants'
import { childrenOf, deleteNode } from '../app/editNode'
import { botanicalLabel, displayLabel, displayName } from '../lib/naming'
import { resolveInherited } from '../lib/taxonomy'
import { asLifecycle, lifecycleLabel } from '../lib/lifecycle'
import { seasonalInterest } from '../lib/calendar'
import { EdibilityFacts } from '../components/KeyFacts'
import PositionCard from '../components/PositionCard'
import SizeCard from '../components/SizeCard'
import ConditionsCard from '../components/ConditionsCard'
import CalendarBar from '../components/CalendarBar'
import ColourInterest from '../components/ColourInterest'
import SeasonStrip from '../components/SeasonStrip'
import Chip from '../components/Chip'

const CURRENT_MONTH = new Date().getMonth() + 1

export default function CheatsheetPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
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

  async function onDelete() {
    const kids = await childrenOf(node.id)
    const msg = kids.length
      ? `Delete "${displayLabel(node)}"? ${kids.length} plant(s) below it will be left without a parent.`
      : `Delete "${displayLabel(node)}"?`
    if (!window.confirm(msg)) return
    await deleteNode(node.id)
    navigate('/')
  }

  return (
    <article className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="text-sm font-medium text-muted hover:text-ink">
          ← Browse
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to={`/plant/${node.id}/edit`}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Masthead: identity (left) beside the Calendar hero (right), with Seasonal interest tucked
          under the identity so the two "time" tiles stay together and the header's right-hand space
          is used. DOM order (identity → calendar → seasonal) is the single-column order on mobile;
          the grid areas place calendar to the right spanning both left-hand rows on ≥lg. */}
      <div className="grid gap-6 lg:grid-cols-6 lg:items-start">
        {/* Name leads the block visually; the classifying tags sit at the end. */}
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
            {resolved.category && <Chip tone="brand">{resolved.category}</Chip>}
            <Chip>{node.rank}</Chip>
            {asLifecycle(resolved.lifecycle)?.map((c) => (
              <Chip key={c}>{lifecycleLabel(c)}</Chip>
            ))}
            {resolved.foliage && <Chip>{resolved.foliage}</Chip>}
            {resolved.habit && <Chip>{resolved.habit}</Chip>}
          </div>
          {node.sourceLinks && node.sourceLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="uppercase tracking-wide text-subtle">Enrich from</span>
              {node.sourceLinks.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-brand-ink hover:underline"
                >
                  {l.label ?? l.source} ↗
                </a>
              ))}
            </div>
          )}
        </header>

        {/* Calendar — the hero, beside the name; spans the right four columns so its left edge
            lines up with Position (and its right edge with Conditions) in the grid below. Natural
            height, not stretched to the identity block. No title (a month grid is self-evident);
            when inherited, the source note (e.g. "from Apple") rides in the calendar's top-left cell. */}
        <div className="lg:col-span-4">
          <Tile bleed={!!resolved.calendar}>
            {resolved.calendar ? (
              <CalendarBar
                calendar={resolved.calendar}
                month={CURRENT_MONTH}
                note={inheritedNote('calendar')}
              />
            ) : (
              <Muted>No calendar recorded yet.</Muted>
            )}
          </Tile>
        </div>
      </div>

      {/* Everything else as one dense tile-grid, ordered by a gardener's decision path: placement
          facts (Position / Conditions / Size), then payoff (Edibility / Wildlife), then reference
          (More facts / Notes / Guides). `grid-auto-flow: dense` + Size as a tall 2-row anchor lets
          short tiles pack beside it. DOM order is also the single-column order on mobile. */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:[grid-auto-flow:dense]">
        {/* Seasonal interest — the spreadsheet's colour tab as a compact horizontal strip, sharing
            the row with Position + Conditions. Falls back to the flat colour list / a placeholder. */}
        <div className="lg:col-span-2">
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

        <div className="lg:col-span-2">
          <Tile title="Position" note={inheritedNote('conditions')} fill bleed>
            <PositionCard conditions={resolved.conditions} />
          </Tile>
        </div>

        <div className="lg:col-span-2">
          <Tile title="Conditions" note={inheritedNote('conditions')} fill bleed>
            <ConditionsCard conditions={resolved.conditions} />
          </Tile>
        </div>

        {/* Size — a deliberate tall anchor (2 rows); short tiles pack down its right. */}
        <div className="lg:col-span-2 lg:row-span-2">
          <Tile title="Size" note={inheritedNote('size')} fill bleed>
            <SizeCard size={resolved.size} />
          </Tile>
        </div>

        {/* Edibility — what's edible + any toxicity caution */}
        <div className="lg:col-span-2">
          <Tile title="Edibility" note={inheritedNote('edible') ?? inheritedNote('toxicity')} fill>
            <EdibilityFacts edible={resolved.edible} toxicity={resolved.toxicity} />
          </Tile>
        </div>

        {/* Wildlife & suggested uses */}
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

        {/* More facts — the free seed-packet chips (spacing, germination, depth, use…) */}
        <div className="lg:col-span-2">
          <Tile title="More facts" note={hasFacts ? inheritedNote('facts') : undefined} fill>
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
        </div>

        {/* Notes */}
        <div className="lg:col-span-2">
          <Tile title="Notes" note={resolved.summary ? inheritedNote('summary') : undefined} fill>
            {resolved.summary ? (
              <p className="text-sm leading-relaxed text-muted">{resolved.summary}</p>
            ) : (
              <Muted>No notes yet.</Muted>
            )}
          </Tile>
        </div>

        {/* Guides — full width to close the grid */}
        <div className="sm:col-span-2 lg:col-span-6">
          <Tile title="Guides" fill>
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
// tile splitting across a column break. `title` is optional — a self-evident tile (the calendar)
// omits it but can still surface its inherited-source `note` alone.
function Tile({
  title,
  note,
  bleed = false,
  fill,
  masonry,
  children,
}: {
  title?: string
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
      {(title || note) && (
        <div className="flex items-baseline gap-2">
          {title && <h2 className="font-display text-h3 font-semibold text-muted">{title}</h2>}
          {note && <span className="text-xs italic text-subtle">{note}</span>}
        </div>
      )}
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
