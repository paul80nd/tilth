import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { buildForest, flattenVisible, allIds, resolveAll, linkedAncestor } from '../lib/tree'
import { seasonalInterest } from '../lib/calendar'
import { SeasonCell } from '../components/SeasonStrip'
import { LightCell, AspectCell, ExposureCell, HardinessCell } from '../components/PositionCard'
import { SoilCell, MoistureCell, PhCell } from '../components/ConditionsCard'
import Chip from '../components/Chip'
import type { PlantNode } from '../schema/plant'

// The taxonomy view: the collection as an expandable family→genus→species→cultivar tree, with the
// cheatsheet's glyphs turned on their side into per-facet square cells — a scannable overview to
// reconcile against the source sheet. Category / Plant / Variety are frozen; the facet columns
// scroll horizontally; both headers stay put. The whole table is the page's one scroll area.

const CELL = 56 // square facet cell (drives the row height)
const POS = 48 // position glyphs sit centred with a little breathing room
const SLOT = Math.round(CELL / 2) // season 2×2 slot → the cell fills edge-to-edge
const COLS = { cat: 56, plant: 200, variety: 150, src: 48 }
const LEFT = {
  cat: 0,
  plant: COLS.cat,
  variety: COLS.cat + COLS.plant,
  src: COLS.cat + COLS.plant + COLS.variety,
}
const GROUP_H = 29 // px height of the group-header row (col headers stick just below it)

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter']
const POSITION = ['Light', 'Aspect', 'Exposure', 'Hardiness']
const CONDITIONS = ['Soil', 'Moisture', 'pH']

/** A fixed square data cell; the glyph fills it edge-to-edge. */
function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-b border-l border-divider p-0">
      <div className="grid place-items-center" style={{ width: CELL, height: CELL }}>{children}</div>
    </td>
  )
}

/** A small chain-link glyph for the source-link indicator. */
function LinkGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 15l6-6" />
      <path d="M10.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1" />
      <path d="M13.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
    </svg>
  )
}

/** The frozen source-state cell: own RHS link (solid, clickable), covered-by-parent (muted),
 *  or an empty gap still to match. */
function SourceCell({ node, byId }: { node: PlantNode; byId: Map<string, PlantNode> }) {
  const own = node.sourceLinks ?? []
  if (own.length) {
    const title = own.map((l) => `${l.source}: ${l.url}`).join('\n')
    return (
      <a href={own[0].url} target="_blank" rel="noopener noreferrer" title={title} className="grid place-items-center text-brand hover:text-brand/70" aria-label="Open source page">
        <LinkGlyph />
        {own.length > 1 && <span className="text-[0.55rem] font-medium leading-none">{own.length}</span>}
      </a>
    )
  }
  const anc = linkedAncestor(node, byId)
  if (anc) {
    const name = anc.commonName ?? anc.botanicalName ?? anc.id
    return (
      <span title={`Covered via ${name}`} className="grid place-items-center text-subtle/50">
        <LinkGlyph />
      </span>
    )
  }
  return <span className="text-line" aria-hidden>·</span>
}

export default function TaxonomyPage() {
  const nodes = useLiveQuery(() => db.nodes.toArray(), [])
  const forest = useMemo(() => (nodes ? buildForest(nodes) : []), [nodes])
  const resolved = useMemo(() => (nodes ? resolveAll(nodes) : new Map()), [nodes])
  const byId = useMemo(() => new Map((nodes ?? []).map((n) => [n.id, n])), [nodes])
  const linkedCount = useMemo(() => (nodes ?? []).filter((n) => n.sourceLinks?.length).length, [nodes])
  // `null` means "all expanded" (the default); a Set once the gardener starts collapsing.
  const [expanded, setExpanded] = useState<Set<string> | null>(null)

  const openSet = useMemo(() => expanded ?? new Set(allIds(forest)), [expanded, forest])
  const rows = useMemo(() => flattenVisible(forest, openSet), [forest, openSet])

  function toggle(id: string) {
    setExpanded((prev) => {
      const base = new Set(prev ?? allIds(forest))
      base.has(id) ? base.delete(id) : base.add(id)
      return base
    })
  }

  if (!nodes) return <div className="p-6 text-sm text-muted">Loading…</div>

  const HeadTop = ({ label, span }: { label: string; span: number }) => (
    <th colSpan={span} className="sticky top-0 z-20 border-b border-l border-divider bg-card px-2 py-1.5 text-center text-xs font-semibold text-ink">
      {label}
    </th>
  )
  const HeadCol = ({ label }: { label: string }) => (
    <th className="sticky z-20 border-b border-l border-divider bg-card px-1 py-1 text-center text-[0.6rem] font-medium uppercase tracking-wide text-subtle" style={{ top: GROUP_H }}>
      {label}
    </th>
  )
  // Frozen identity header cells (sticky both top and left → corner, above everything).
  const frozenHead = (label: string, key: keyof typeof COLS, row: 0 | 1) => (
    <th
      className="sticky z-30 border-b border-divider bg-card px-2 py-1 text-left text-[0.6rem] font-medium uppercase tracking-wide text-subtle"
      style={{ left: LEFT[key], width: COLS[key], top: row === 0 ? 0 : GROUP_H }}
    >
      {label}
    </th>
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end justify-between gap-3 px-4 pb-3 pt-6">
        <div>
          <h1 className="font-display text-display font-semibold tracking-tight">Taxonomy</h1>
          <p className="text-sm text-muted">
            Every plant as a tree — expand the hierarchy and scan each one's facets side by side,
            like the source sheet.
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-subtle">
            <span className="text-brand"><LinkGlyph /></span>
            {linkedCount} linked to a source
          </p>
        </div>
        <div className="flex flex-none gap-2 text-xs">
          <button onClick={() => setExpanded(new Set(allIds(forest)))} className="rounded-md border border-line px-2 py-1 text-muted hover:bg-sunken hover:text-ink">
            Expand all
          </button>
          <button onClick={() => setExpanded(new Set())} className="rounded-md border border-line px-2 py-1 text-muted hover:bg-sunken hover:text-ink">
            Collapse all
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto border-t border-line">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {frozenHead('', 'cat', 0)}
              {frozenHead('', 'plant', 0)}
              {frozenHead('', 'variety', 0)}
              {frozenHead('', 'src', 0)}
              <HeadTop label="Seasonal interest" span={4} />
              <HeadTop label="Position" span={4} />
              <HeadTop label="Conditions" span={3} />
            </tr>
            <tr>
              {frozenHead('Cat', 'cat', 1)}
              {frozenHead('Plant', 'plant', 1)}
              {frozenHead('Variety', 'variety', 1)}
              {frozenHead('Src', 'src', 1)}
              {[...SEASONS, ...POSITION, ...CONDITIONS].map((c) => (
                <HeadCol key={c} label={c} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ node, depth, children }) => {
              const r = resolved.get(node.id)?.node ?? node
              const c = r.conditions
              const interest = seasonalInterest(r.calendar, r.colour)
              // Only draw a glyph where the plant actually has that facet — an empty cell reads far
              // cleaner across the whole record and makes "still to enrich" obvious at a glance.
              const hasInterest = interest.some((s) => s.parts.length > 0)
              const open = openSet.has(node.id)
              const name = node.commonName ?? node.botanicalName ?? node.id
              return (
                <tr key={node.id} className="hover:bg-sunken/40">
                  <td className="sticky z-10 border-b border-divider bg-card px-2 align-middle" style={{ left: LEFT.cat, width: COLS.cat }}>
                    {r.category && <Chip tone="brand">{r.category}</Chip>}
                  </td>
                  <td className="sticky z-10 border-b border-divider bg-card px-2 align-middle" style={{ left: LEFT.plant, width: COLS.plant }}>
                    <div className="flex items-center gap-1" style={{ paddingLeft: depth * 14 }}>
                      {children.length ? (
                        <button onClick={() => toggle(node.id)} className="w-4 flex-none text-subtle hover:text-ink" aria-label={open ? 'Collapse' : 'Expand'}>
                          {open ? '▾' : '▸'}
                        </button>
                      ) : (
                        <span className="w-4 flex-none" />
                      )}
                      <Link to={`/plant/${node.id}`} className="truncate hover:underline" title={name}>
                        {name}
                      </Link>
                    </div>
                  </td>
                  <td className="sticky z-10 border-b border-divider bg-card px-2 align-middle text-muted" style={{ left: LEFT.variety, width: COLS.variety }}>
                    <span className="block truncate" title={node.variety ?? ''}>{node.variety ?? ''}</span>
                  </td>
                  <td className="sticky z-10 border-b border-r border-line bg-card px-0 align-middle" style={{ left: LEFT.src, width: COLS.src }}>
                    <div className="grid place-items-center"><SourceCell node={node} byId={byId} /></div>
                  </td>
                  {interest.map((s) => (
                    <Cell key={s.season}>{hasInterest ? <SeasonCell parts={s.parts} slot={SLOT} /> : null}</Cell>
                  ))}
                  <Cell>{c?.sun?.length ? <LightCell conditions={c} size={POS} /> : null}</Cell>
                  <Cell>{c?.aspect?.length ? <AspectCell conditions={c} size={POS} /> : null}</Cell>
                  <Cell>{c?.exposure?.length ? <ExposureCell conditions={c} size={POS} /> : null}</Cell>
                  <Cell>{c?.hardiness ? <HardinessCell conditions={c} /> : null}</Cell>
                  <Cell>{c?.soil?.length ? <SoilCell conditions={c} size={CELL} flush /> : null}</Cell>
                  <Cell>{c?.moisture?.length ? <MoistureCell conditions={c} size={CELL} flush /> : null}</Cell>
                  <Cell>{c?.ph?.length ? <PhCell conditions={c} size={CELL} flush /> : null}</Cell>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
