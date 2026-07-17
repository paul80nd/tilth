import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { buildForest, flattenVisible, allIds, resolveAll, linkedAncestor, withUnplacedBucket, isBannerRow, flatPlants } from '../lib/tree'
import type { TreeNode } from '../lib/tree'
import { seasonalInterest } from '../lib/calendar'
import { SeasonCell } from '../components/SeasonStrip'
import { LightCell, AspectCell, ExposureCell, HardinessCell } from '../components/PositionCard'
import { SoilCell, MoistureCell, PhCell } from '../components/ConditionsCard'
import Chip from '../components/Chip'
import { CheatsheetModal } from '../components/CheatsheetModal'
import { bannerParts } from '../lib/taxonNames'
import type { PlantNode } from '../schema/plant'

// The taxonomy view: the collection as an expandable family→genus→species→cultivar tree, with the
// cheatsheet's glyphs turned on their side into per-facet square cells — a scannable overview to
// reconcile against the source sheet. Category / Plant / Variety are frozen; the facet columns
// scroll horizontally; both headers stay put. The whole table is the page's one scroll area.

const CELL = 56 // square facet cell (drives the row height)
const POS = 48 // position glyphs sit centred with a little breathing room
const SLOT = Math.round(CELL / 2) // season 2×2 slot → the cell fills edge-to-edge
// Frozen identity column widths. Which columns appear depends on the view mode: the flat A–Z
// list adds a Family / Genus column (the tree's banners give that context; the flat list can't).
// Each is pinned to an exact width (min == max == width, see `frozen`) so content can't stretch
// it past its sticky `left` offset and misalign the frozen columns on horizontal scroll.
const COLW = { plant: 210, famgen: 210, cat: 66, src: 48 }
const HEAD: Record<keyof typeof COLW, string> = {
  plant: 'Plant / Variety',
  famgen: 'Family / Genus',
  cat: 'Cat',
  src: 'Src',
}
const GROUP_H = 29 // px height of the group-header row (col headers stick just below it)

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter']
const POSITION = ['Light', 'Aspect', 'Exposure', 'Hardiness']
const CONDITIONS = ['Soil', 'Moisture', 'pH']
const FACET_COLS = SEASONS.length + POSITION.length + CONDITIONS.length

/** Count the plants beneath a tree row for the "· N" tally on a section-marker banner — every
 *  descendant that is itself a plant, i.e. not a grouping banner. A genus-LEAF (a genus with
 *  nothing beneath it, e.g. Viburnum) counts as a plant; a grouping family/genus does not. */
function countPlants(kids: TreeNode[]): number {
  return kids.reduce((n, k) => n + (isBannerRow(k) ? 0 : 1) + countPlants(k.children), 0)
}

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

/** One line of the flat-view Family / Genus cell — the same "common name · scientific" label
 *  construction the tree banners use, built from a plant's resolved family/genus string. */
function TaxonLine({ rank, sci, muted }: { rank: 'family' | 'genus'; sci?: string; muted?: boolean }) {
  if (!sci) return null
  const { primary, secondary } = bannerParts({ id: sci, rank, botanicalName: sci })
  return (
    <span className={`block truncate text-xs ${muted ? 'text-muted' : 'text-ink'}`} title={secondary ? `${primary} · ${secondary}` : primary}>
      {primary}
      {secondary && <span className="italic text-subtle"> · {secondary}</span>}
    </span>
  )
}

export default function TaxonomyPage() {
  const nodes = useLiveQuery(() => db.nodes.toArray(), [])
  const forest = useMemo(() => (nodes ? withUnplacedBucket(buildForest(nodes)) : []), [nodes])
  const resolved = useMemo(() => (nodes ? resolveAll(nodes) : new Map()), [nodes])
  const byId = useMemo(() => new Map((nodes ?? []).map((n) => [n.id, n])), [nodes])
  const linkedCount = useMemo(() => (nodes ?? []).filter((n) => n.sourceLinks?.length).length, [nodes])
  // `null` means "all expanded" (the default); a Set once the gardener starts collapsing.
  const [expanded, setExpanded] = useState<Set<string> | null>(null)
  // Group by the family→genus tree, or a flat A–Z list of plants (to reconcile against a
  // spreadsheet sorted by plant name).
  const [mode, setMode] = useState<'tree' | 'flat'>('tree')
  // The plant whose cheatsheet is open in the modal — a modal (not a route) so the tree keeps its
  // scroll position while you inspect a plant.
  const [modalId, setModalId] = useState<string | null>(null)

  const openSet = useMemo(() => expanded ?? new Set(allIds(forest)), [expanded, forest])
  const rows = useMemo(
    () =>
      mode === 'flat'
        ? flatPlants(nodes ?? []).map((node) => ({ node, depth: 0, children: [] as TreeNode[] }))
        : flattenVisible(forest, openSet),
    [mode, nodes, forest, openSet],
  )

  function toggle(id: string) {
    setExpanded((prev) => {
      const base = new Set(prev ?? allIds(forest))
      base.has(id) ? base.delete(id) : base.add(id)
      return base
    })
  }

  if (!nodes) return <div className="p-6 text-sm text-muted">Loading…</div>

  // The frozen columns for this mode, and their cumulative left offsets.
  const frozenCols: Array<keyof typeof COLW> = mode === 'flat' ? ['plant', 'famgen', 'cat', 'src'] : ['plant', 'cat', 'src']
  const leftOf: Partial<Record<keyof typeof COLW, number>> = {}
  let acc = 0
  for (const k of frozenCols) {
    leftOf[k] = acc
    acc += COLW[k]
  }
  const TOTAL_COLS = frozenCols.length + FACET_COLS
  // Pin a frozen column to an exact width and its sticky left offset.
  const frozen = (key: keyof typeof COLW) => ({ left: leftOf[key], width: COLW[key], minWidth: COLW[key], maxWidth: COLW[key] })

  // A 1px card-colour shadow under each sticky header cell paints over the sub-pixel seam
  // between the two header rows (and header→body) — the column-header row is a fractional
  // height, so without it scrolling content bleeds through the hairline (worst in dark mode).
  const SEAM = 'shadow-[0_1px_0_0_var(--color-card)]'
  const HeadTop = ({ label, span }: { label: string; span: number }) => (
    <th colSpan={span} className={`sticky top-0 z-20 border-b border-l border-divider bg-card px-2 py-1.5 text-center text-xs font-semibold text-ink ${SEAM}`}>
      {label}
    </th>
  )
  const HeadCol = ({ label }: { label: string }) => (
    <th className={`sticky z-20 border-b border-l border-divider bg-card px-1 py-1 text-center text-[0.6rem] font-medium uppercase tracking-wide text-subtle ${SEAM}`} style={{ top: GROUP_H }}>
      {label}
    </th>
  )
  // Frozen identity header cells (sticky both top and left → corner, above everything).
  const frozenHead = (label: string, key: keyof typeof COLW, row: 0 | 1) => (
    <th
      key={key}
      className={`sticky z-30 border-b border-divider bg-card px-2 py-1 text-left text-[0.6rem] font-medium uppercase tracking-wide text-subtle ${SEAM}`}
      style={{ ...frozen(key), top: row === 0 ? 0 : GROUP_H }}
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
        <div className="flex flex-none items-center gap-2 text-xs">
          {mode === 'tree' && (
            <>
              <button onClick={() => setExpanded(new Set(allIds(forest)))} className="rounded-md border border-line px-2 py-1 text-muted hover:bg-sunken hover:text-ink">
                Expand all
              </button>
              <button onClick={() => setExpanded(new Set())} className="rounded-md border border-line px-2 py-1 text-muted hover:bg-sunken hover:text-ink">
                Collapse all
              </button>
            </>
          )}
          {/* Kept last so it stays anchored to the right as Expand/Collapse show/hide. */}
          <div className="flex overflow-hidden rounded-md border border-line">
            <button
              onClick={() => setMode('tree')}
              className={mode === 'tree' ? 'bg-brand px-2 py-1 font-medium text-white' : 'px-2 py-1 text-muted hover:bg-sunken hover:text-ink'}
            >
              Family tree
            </button>
            <button
              onClick={() => setMode('flat')}
              className={mode === 'flat' ? 'bg-brand px-2 py-1 font-medium text-white' : 'px-2 py-1 text-muted hover:bg-sunken hover:text-ink'}
            >
              A–Z
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto border-t border-line">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {frozenCols.map((k) => frozenHead('', k, 0))}
              <HeadTop label="Seasonal interest" span={4} />
              <HeadTop label="Position" span={4} />
              <HeadTop label="Conditions" span={3} />
            </tr>
            <tr>
              {frozenCols.map((k) => frozenHead(HEAD[k], k, 1))}
              {[...SEASONS, ...POSITION, ...CONDITIONS].map((c) => (
                <HeadCol key={c} label={c} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const { node, children } = t
              const open = openSet.has(node.id)
              const name = node.commonName ?? node.botanicalName ?? node.id

              // Family/genus grouping rows are full-width section markers, not data rows — their
              // facets would describe a taxon, not a plant, so they'd always be blank. The label
              // sticks to the left edge as the facet columns scroll.
              if (isBannerRow(t)) {
                const isFamily = node.rank === 'family'
                // Family and genus both sit flush left — the font weight/tone carries the
                // hierarchy, not indentation. Common name leads; the scientific name trails
                // muted. The label sticks to the left as the facet columns scroll.
                const { primary, secondary } = bannerParts(node)
                return (
                  <tr key={node.id}>
                    <td colSpan={TOTAL_COLS} className={`border-b border-divider p-0 ${isFamily ? 'bg-sunken' : 'bg-sunken/60'}`}>
                      <div className="sticky left-0 flex w-max items-baseline gap-1.5 py-1.5 pl-2 pr-4">
                        <button onClick={() => toggle(node.id)} className="w-4 flex-none self-center text-subtle hover:text-ink" aria-label={open ? 'Collapse' : 'Expand'}>
                          {open ? '▾' : '▸'}
                        </button>
                        <span className={isFamily ? 'text-sm font-semibold text-ink' : 'text-sm font-medium text-muted'}>{primary}</span>
                        {secondary && <span className="text-xs italic text-subtle">· {secondary}</span>}
                        <span className="text-[0.65rem] tabular-nums text-subtle">· {countPlants(children)}</span>
                      </div>
                    </td>
                  </tr>
                )
              }

              const r = resolved.get(node.id)?.node ?? node
              const c = r.conditions
              const interest = seasonalInterest(r.calendar, r.colour)
              // Only draw a glyph where the plant actually has that facet — an empty cell reads far
              // cleaner across the whole record and makes "still to enrich" obvious at a glance.
              const hasInterest = interest.some((s) => s.parts.length > 0)
              return (
                <tr key={node.id} className="hover:bg-sunken/40">
                  <td className="sticky z-10 border-b border-divider bg-card px-2 align-middle" style={frozen('plant')}>
                    <div className="flex items-start gap-1">
                      {children.length ? (
                        <button onClick={() => toggle(node.id)} className="w-4 flex-none text-subtle hover:text-ink" aria-label={open ? 'Collapse' : 'Expand'}>
                          {open ? '▾' : '▸'}
                        </button>
                      ) : (
                        <span className="w-4 flex-none" />
                      )}
                      <div className="min-w-0">
                        <button type="button" onClick={() => setModalId(node.id)} className="block max-w-full truncate text-left hover:underline" title={name}>
                          {name}
                        </button>
                        {node.variety && (
                          <span className="block truncate text-xs text-muted" title={node.variety}>{node.variety}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  {mode === 'flat' && (
                    <td className="sticky z-10 border-b border-divider bg-card px-2 align-middle" style={frozen('famgen')}>
                      <TaxonLine rank="family" sci={r.family} />
                      <TaxonLine rank="genus" sci={r.genus} muted />
                    </td>
                  )}
                  <td className="sticky z-10 border-b border-divider bg-card px-2 align-middle" style={frozen('cat')}>
                    {r.category && <Chip tone="brand">{r.category}</Chip>}
                  </td>
                  <td className="sticky z-10 border-b border-r border-line bg-card px-0 align-middle" style={frozen('src')}>
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

      {modalId && <CheatsheetModal id={modalId} onClose={() => setModalId(null)} />}
    </div>
  )
}
