import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Conditions, PlantNode } from '../schema/plant'
import { getGuidesFor, getLineage } from '../app/plants'
import { botanicalLabel, displayLabel, displayName } from '../lib/naming'
import { resolveInherited } from '../lib/taxonomy'
import CalendarBar from '../components/CalendarBar'
import Chip from '../components/Chip'

const CURRENT_MONTH = new Date().getMonth() + 1

// Which Conditions keys to render, in order, with a heading.
const CONDITION_ROWS: Array<{ key: keyof Conditions; label: string }> = [
  { key: 'sun', label: 'Sun' },
  { key: 'soil', label: 'Soil' },
  { key: 'moisture', label: 'Moisture' },
  { key: 'ph', label: 'pH' },
  { key: 'exposure', label: 'Exposure' },
]

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
        {botanical && <p className="text-sm italic text-muted">{botanical}</p>}
      </header>

      {/* calendar */}
      <Section title="Calendar" note={inheritedNote('calendar')}>
        {resolved.calendar ? (
          <CalendarBar calendar={resolved.calendar} month={CURRENT_MONTH} />
        ) : (
          <Muted>No calendar recorded yet.</Muted>
        )}
      </Section>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* conditions */}
        <Section title="Conditions" note={inheritedNote('conditions')}>
          {resolved.conditions ? (
            <dl className="flex flex-col gap-2">
              {CONDITION_ROWS.map(({ key, label }) => {
                const values = resolved.conditions?.[key] as string[] | undefined
                if (!values?.length) return null
                return (
                  <div key={key} className="flex items-baseline gap-2">
                    <dt className="w-20 flex-none text-xs uppercase tracking-wide text-subtle">{label}</dt>
                    <dd className="flex flex-wrap gap-1">
                      {values.map((v) => (
                        <Chip key={v}>{v}</Chip>
                      ))}
                    </dd>
                  </div>
                )
              })}
              {resolved.conditions.hardiness && (
                <div className="flex items-baseline gap-2">
                  <dt className="w-20 flex-none text-xs uppercase tracking-wide text-subtle">Hardiness</dt>
                  <dd>
                    <Chip tone="brand">{resolved.conditions.hardiness}</Chip>
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <Muted>Not recorded yet.</Muted>
          )}
        </Section>

        {/* size */}
        <Section title="Ultimate size" note={inheritedNote('size')}>
          {resolved.size ? (
            <dl className="flex flex-col gap-2">
              <SizeRow label="Height" value={resolved.size.height} />
              <SizeRow label="Spread" value={resolved.size.spread} />
              <SizeRow label="Time" value={resolved.size.timeToSize} />
            </dl>
          ) : (
            <Muted>Not recorded yet.</Muted>
          )}
        </Section>
      </div>

      {/* facts */}
      {resolved.facts && Object.keys(resolved.facts).length > 0 && (
        <Section title="At a glance" note={inheritedNote('facts')}>
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

function SizeRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-20 flex-none text-xs uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>
}
