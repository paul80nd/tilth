import { useMemo, useState } from 'react'
import { cx } from '../lib/cx'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Category, PhaseSpan, PlantNode } from '../schema/plant'
import { listNodes } from '../app/plants'
import { categoriesOf, familiesOf, filterNodes, generaOf } from '../lib/browse'
import { hasActionInMonth } from '../lib/calendar'
import PlantCard from '../components/PlantCard'

const CURRENT_MONTH = new Date().getMonth() + 1

/** Effective calendar for the "in season" hint: the node's own, else the nearest ancestor's. */
function effectiveCalendar(
  node: PlantNode,
  byId: Map<string, PlantNode>,
): PhaseSpan[] | undefined {
  const seen = new Set<string>()
  let cur: PlantNode | undefined = node
  while (cur && !seen.has(cur.id)) {
    if (cur.calendar) return cur.calendar
    seen.add(cur.id)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }
  return undefined
}

export default function BrowsePage() {
  const nodes = useLiveQuery(listNodes, [], [] as PlantNode[])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | undefined>()
  const [genus, setGenus] = useState('')
  const [family, setFamily] = useState('')

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const categories = useMemo(() => categoriesOf(nodes), [nodes])
  const genera = useMemo(() => generaOf(nodes), [nodes])
  const families = useMemo(() => familiesOf(nodes), [nodes])

  const results = useMemo(
    () =>
      filterNodes(nodes, {
        query,
        category,
        genus: genus || undefined,
        family: family || undefined,
      }),
    [nodes, query, category, genus, family],
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display font-semibold tracking-tight">Browse</h1>
          <p className="text-sm text-muted">Everything in your plant record.</p>
        </div>
        <Link
          to="/add"
          className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-onbrand hover:opacity-90"
        >
          + Add plant
        </Link>
      </div>

      {/* toolbar */}
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name — common, variety or botanical…"
          className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="flex flex-wrap items-center gap-2">
          <CategoryButton active={!category} onClick={() => setCategory(undefined)}>
            All
          </CategoryButton>
          {categories.map((c) => (
            <CategoryButton key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </CategoryButton>
          ))}

          <div className="ml-auto flex flex-wrap gap-2">
            <Select value={genus} onChange={setGenus} label="Genus" options={genera} />
            <Select value={family} onChange={setFamily} label="Family" options={families} />
          </div>
        </div>
      </div>

      {/* results */}
      <p className="text-xs text-subtle">
        {results.length} {results.length === 1 ? 'plant' : 'plants'}
      </p>

      {results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-strong bg-card p-8 text-center text-sm text-muted">
          Nothing matches those filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((node) => (
            <PlantCard
              key={node.id}
              node={node}
              activeThisMonth={hasActionInMonth(effectiveCalendar(node, byId), CURRENT_MONTH)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
        active ? 'bg-brand text-onbrand' : 'bg-sunken text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  options: string[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="rounded-md border border-line bg-card px-2 py-1.5 text-sm text-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">{label}: all</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
