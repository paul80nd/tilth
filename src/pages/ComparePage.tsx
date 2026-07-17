import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { buildForest, flattenVisible, allIds, resolveAll } from '../lib/tree'
import { seasonalInterest } from '../lib/calendar'
import { SeasonCell } from '../components/SeasonStrip'
import { LightCell, AspectCell, ExposureCell, HardinessCell } from '../components/PositionCard'
import { SoilCell, MoistureCell, PhCell } from '../components/ConditionsCard'
import Chip from '../components/Chip'

// The compare view: the taxonomy as an expandable tree-table, with the cheatsheet's glyphs turned
// on their side into per-facet square cells — a scannable overview to reconcile against the source
// sheet. Category / Plant / Variety are frozen; the facet columns scroll horizontally.

const GLYPH = 52 // glyph size inside a data cell
const COLS = { cat: 56, plant: 210, variety: 150 }
const LEFT = { cat: 0, plant: COLS.cat, variety: COLS.cat + COLS.plant }

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter']
const POSITION = ['Light', 'Aspect', 'Exposure', 'Hardiness']
const CONDITIONS = ['Soil', 'Moisture', 'pH']

/** A fixed square data cell with its glyph centred. */
function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-b border-l border-divider p-0">
      <div className="grid h-[72px] w-[72px] place-items-center">{children}</div>
    </td>
  )
}

export default function ComparePage() {
  const nodes = useLiveQuery(() => db.nodes.toArray(), [])
  const forest = useMemo(() => (nodes ? buildForest(nodes) : []), [nodes])
  const resolved = useMemo(() => (nodes ? resolveAll(nodes) : new Map()), [nodes])
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

  if (!nodes) return <p className="text-sm text-muted">Loading…</p>

  const HeadTop = ({ label, span }: { label: string; span: number }) => (
    <th colSpan={span} className="sticky top-0 z-20 border-b border-l border-divider bg-card px-2 py-1.5 text-center text-xs font-semibold text-ink">
      {label}
    </th>
  )
  const HeadCol = ({ label }: { label: string }) => (
    <th className="sticky top-[33px] z-20 border-b border-l border-divider bg-card px-1 py-1 text-center text-[0.6rem] font-medium uppercase tracking-wide text-subtle">
      {label}
    </th>
  )
  // Frozen identity header cells (sticky both top and left → corner, above everything).
  const frozenHead = (label: string, key: keyof typeof COLS, row: 0 | 1) => (
    <th
      className="sticky z-30 border-b border-divider bg-card px-2 py-1 text-left text-[0.6rem] font-medium uppercase tracking-wide text-subtle"
      style={{ left: LEFT[key], width: COLS[key], top: row === 0 ? 0 : 33 }}
    >
      {label}
    </th>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-display font-semibold tracking-tight">Compare</h1>
          <p className="text-sm text-muted">
            Every plant in your record as a tree — expand the taxonomy and scan each one's facets
            side by side, like the source sheet.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={() => setExpanded(new Set(allIds(forest)))} className="rounded-md border border-line px-2 py-1 text-muted hover:bg-sunken hover:text-ink">
            Expand all
          </button>
          <button onClick={() => setExpanded(new Set())} className="rounded-md border border-line px-2 py-1 text-muted hover:bg-sunken hover:text-ink">
            Collapse all
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {frozenHead('', 'cat', 0)}
              {frozenHead('', 'plant', 0)}
              {frozenHead('', 'variety', 0)}
              <HeadTop label="Seasonal interest" span={4} />
              <HeadTop label="Position" span={4} />
              <HeadTop label="Conditions" span={3} />
            </tr>
            <tr>
              {frozenHead('Cat', 'cat', 1)}
              {frozenHead('Plant', 'plant', 1)}
              {frozenHead('Variety', 'variety', 1)}
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
              const open = openSet.has(node.id)
              const name = node.commonName ?? node.botanicalName ?? node.id
              return (
                <tr key={node.id} className="hover:bg-sunken/40">
                  <td className="sticky z-10 border-b border-divider bg-card px-2 align-middle" style={{ left: LEFT.cat, width: COLS.cat }}>
                    {r.category && <Chip tone="brand">{r.category}</Chip>}
                  </td>
                  <td className="sticky z-10 border-b border-r border-divider bg-card px-2 align-middle" style={{ left: LEFT.plant, width: COLS.plant }}>
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
                  <td className="sticky z-10 border-b border-r border-line bg-card px-2 align-middle text-muted" style={{ left: LEFT.variety, width: COLS.variety }}>
                    <span className="block truncate" title={node.variety ?? ''}>{node.variety ?? ''}</span>
                  </td>
                  {interest.map((s) => (
                    <Cell key={s.season}>
                      <SeasonCell parts={s.parts} />
                    </Cell>
                  ))}
                  <Cell><LightCell conditions={c} size={GLYPH} /></Cell>
                  <Cell><AspectCell conditions={c} size={GLYPH} /></Cell>
                  <Cell><ExposureCell conditions={c} size={GLYPH} /></Cell>
                  <Cell><HardinessCell conditions={c} /></Cell>
                  <Cell><SoilCell conditions={c} size={GLYPH} /></Cell>
                  <Cell><MoistureCell conditions={c} size={GLYPH} /></Cell>
                  <Cell><PhCell conditions={c} size={GLYPH} /></Cell>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
