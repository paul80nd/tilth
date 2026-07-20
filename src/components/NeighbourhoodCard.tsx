import { Link } from 'react-router-dom'
import type { PlantNode } from '../schema/plant'
import type { Neighbourhood } from '../lib/neighbourhood'
import { displayName } from '../lib/naming'

// The "Neighbourhood" card: where this plant sits in the local taxonomy — its family and genus,
// then every species (with cultivars) under that genus. The current plant is highlighted and
// non-clickable; every other node links to its own cheatsheet. Read-only view of the subtree.

/** A node's short label for the tree: a cultivar shows just its variety (its species name is the
 *  parent row); a species/genus shows its common-or-botanical name. */
function shortLabel(node: PlantNode, asChild: boolean): string {
  const { plant, variety } = displayName(node)
  if (asChild && variety) return variety
  return variety && !asChild ? `${plant} · ${variety}` : plant
}

function TaxonName({
  node,
  current,
  asChild,
  onNavigate,
}: {
  node: PlantNode
  current: boolean
  asChild?: boolean
  onNavigate?: (id: string) => void
}) {
  const label = shortLabel(node, !!asChild)
  const linkClass = 'text-ink hover:text-brand-ink hover:underline'
  if (current) {
    return (
      <span aria-current="page" className="font-semibold text-brand-ink">
        {label}
      </span>
    )
  }
  // In the modal, swap the shown plant in place; on the full page, navigate to its route.
  if (onNavigate) {
    return (
      <button type="button" onClick={() => onNavigate(node.id)} className={linkClass}>
        {label}
      </button>
    )
  }
  return (
    <Link to={`/plant/${node.id}`} className={linkClass}>
      {label}
    </Link>
  )
}

export function NeighbourhoodCard({
  data,
  currentId,
  onNavigate,
}: {
  data: Neighbourhood
  currentId: string
  /** When set, a neighbour click calls this (the modal swaps in place) instead of navigating. */
  onNavigate?: (id: string) => void
}) {
  const { family, genus, entries } = data
  return (
    <div className="flex flex-col gap-2 text-sm">
      {/* Family › Genus breadcrumb */}
      <p className="flex flex-wrap items-baseline gap-1.5 text-xs">
        {family && (
          <>
            <TaxonName node={family} current={family.id === currentId} onNavigate={onNavigate} />
            <span className="text-subtle">›</span>
          </>
        )}
        <span className="font-medium">
          <TaxonName node={genus} current={genus.id === currentId} onNavigate={onNavigate} />
        </span>
      </p>

      {entries.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {entries.map((e) => (
            <li key={e.node.id} className="flex flex-wrap items-baseline gap-x-1.5">
              <TaxonName node={e.node} current={e.node.id === currentId} onNavigate={onNavigate} />
              {e.children.length > 0 && (
                <>
                  <span className="text-subtle">›</span>
                  <span className="flex flex-wrap items-baseline gap-x-1 text-muted">
                    {e.children.map((c, i) => (
                      <span key={c.id} className="inline-flex items-baseline">
                        <TaxonName node={c} current={c.id === currentId} asChild onNavigate={onNavigate} />
                        {i < e.children.length - 1 && <span className="text-subtle">,</span>}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nothing else recorded in this genus yet.</p>
      )}
    </div>
  )
}
