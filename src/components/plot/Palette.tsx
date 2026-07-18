import { useMemo, useState } from 'react'
import type { PlantNode } from '../../schema/plant'
import type { PlacementShape } from '../../schema/userData'
import { displayLabel, matchesQuery } from '../../lib/naming'

// The plant palette: pick a plant to "arm" as the brush, then draw it onto a bed. Lists the plants
// you already hold first (your garden), with a search into the whole collection to add new ones.
// The brush mode picks how a placement is laid down — a packed area, or a single round/rect plant.

export interface PaletteProps {
  /** Browsable plants (species + cultivars), to search/add. */
  plants: PlantNode[]
  /** Node ids you already have a holding of — surfaced at the top. */
  heldNodeIds: Set<string>
  brushNodeId: string | null
  brushShape: PlacementShape
  onArm: (nodeId: string | null) => void
  onShapeChange: (shape: PlacementShape) => void
}

/** The brush modes, in the palette order, with a glyph + how they place. */
const SHAPE_MODES: { shape: PlacementShape; label: string; glyph: string; hint: string }[] = [
  { shape: 'area', label: 'Area', glyph: '▦', hint: 'Drag a block — packed with plants at their spacing.' },
  { shape: 'round', label: 'Pot', glyph: '◯', hint: 'Click for one plant; drag out to set its radius.' },
  { shape: 'rect', label: 'Espalier', glyph: '▭', hint: 'Drag a rectangle — one plant trained to fill it.' },
]

export default function Palette({ plants, heldNodeIds, brushNodeId, brushShape, onArm, onShapeChange }: PaletteProps) {
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
        <div className="mt-2 flex gap-1" role="group" aria-label="Placement mode">
          {SHAPE_MODES.map((m) => {
            const on = brushShape === m.shape
            return (
              <button
                key={m.shape}
                type="button"
                onClick={() => onShapeChange(m.shape)}
                aria-pressed={on}
                title={m.hint}
                className={['flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium', on ? 'bg-brand text-onbrand' : 'bg-sunken text-muted hover:text-ink'].join(' ')}
              >
                <span aria-hidden>{m.glyph}</span>
                {m.label}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {brushNodeId ? SHAPE_MODES.find((m) => m.shape === brushShape)?.hint : 'Pick a plant, then draw it onto a bed.'}
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
