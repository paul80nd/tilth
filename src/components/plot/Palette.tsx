import { useMemo, useState } from 'react'
import type { PlantNode } from '../../schema/plant'
import { displayLabel, matchesQuery } from '../../lib/naming'

// The plant palette: pick a plant to "arm" as the brush, then draw it onto a bed. Lists the plants
// you already hold first (your garden), with a search into the whole collection to add new ones.

export interface PaletteProps {
  /** Browsable plants (species + cultivars), to search/add. */
  plants: PlantNode[]
  /** Node ids you already have a holding of — surfaced at the top. */
  heldNodeIds: Set<string>
  brushNodeId: string | null
  onArm: (nodeId: string | null) => void
}

export default function Palette({ plants, heldNodeIds, brushNodeId, onArm }: PaletteProps) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const matched = plants.filter((p) => matchesQuery(p, query))
    // held first, then alphabetical
    return matched.sort((a, b) => {
      const ha = heldNodeIds.has(a.id) ? 0 : 1
      const hb = heldNodeIds.has(b.id) ? 0 : 1
      return ha - hb || displayLabel(a).localeCompare(displayLabel(b))
    })
  }, [plants, query, heldNodeIds])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-3">
        <h2 className="text-sm font-semibold text-ink">Plants</h2>
        <p className="mt-0.5 text-xs text-muted">
          {brushNodeId ? 'Draw on a bed to place it.' : 'Pick a plant, then draw it onto a bed.'}
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plants…"
          className="mt-2 w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-2">
        {results.map((p) => {
          const armed = brushNodeId === p.id
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onArm(armed ? null : p.id)}
                className={[
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  armed ? 'bg-brand text-onbrand' : 'text-ink hover:bg-sunken',
                ].join(' ')}
              >
                <span className="truncate">{displayLabel(p)}</span>
                {heldNodeIds.has(p.id) && !armed && (
                  <span className="ml-auto shrink-0 rounded bg-brand-tint px-1.5 py-0.5 text-[0.65rem] font-medium text-brand-ink">
                    growing
                  </span>
                )}
              </button>
            </li>
          )
        })}
        {results.length === 0 && <li className="px-2 py-3 text-xs text-muted">No plants match.</li>}
      </ul>
    </div>
  )
}
