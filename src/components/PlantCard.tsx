import { Link } from 'react-router-dom'
import type { PlantNode } from '../schema/plant'
import { botanicalLabel, displayName, taxonTag } from '../lib/naming'
import Chip from './Chip'

// A browse card: variety-forward name (what you call it), a category chip, the genus/family
// as a small tag, and a light "in season" marker when there's an actionable job this month.
// The hero-image slot is intentionally absent until the image model is designed.
export default function PlantCard({
  node,
  activeThisMonth,
}: {
  node: PlantNode
  activeThisMonth: boolean
}) {
  const { plant, variety } = displayName(node)
  const botanical = botanicalLabel(node)
  const tag = taxonTag(node)

  return (
    <Link
      to={`/plant/${node.id}`}
      className="group flex flex-col gap-2 rounded-lg border border-line bg-card p-4 shadow-xs transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {node.category && <Chip tone="brand">{node.category}</Chip>}
          {node.rank === 'cultivar' && <Chip>variety</Chip>}
        </div>
        {activeThisMonth && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-ink" title="Something to do this month">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            in season
          </span>
        )}
      </div>

      <div>
        <h3 className="font-display text-h3 font-semibold leading-tight">{plant}</h3>
        {variety && <p className="text-sm font-medium text-brand-ink">{variety}</p>}
        {botanical && <p className="mt-0.5 text-xs italic text-subtle">{botanical}</p>}
      </div>

      {tag && (
        <div className="mt-auto pt-1">
          <Chip title="Genus / family">{tag}</Chip>
        </div>
      )}
    </Link>
  )
}
