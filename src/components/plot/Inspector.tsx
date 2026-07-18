import type { Bed, Holding } from '../../schema/userData'
import type { PlantNode } from '../../schema/plant'
import { displayLabel } from '../../lib/naming'
import { plantsInRegion } from '../../lib/spacing'
import { Field, SizeInput, inputCls } from './fields'

// The inspector: edit the currently-selected bed or placement. A thin shell over the garden seam —
// every change is persisted by the callbacks the page wires to src/app/garden.ts. (Plot size is
// edited in its own modal — see PlotSizeModal.)

export interface InspectorProps {
  bed?: Bed
  placement?: Holding
  node?: PlantNode
  /** Snap increment (m) for typed bed sizes; 0 when snapping is off (a 0.1 spinner step is used). */
  snapStep: number
  onBedChange: (patch: Partial<Bed>) => void
  onRemoveBed: () => void
  onQuantityChange: (qty: number) => void
  onUnplace: () => void
}

const BED_KINDS: Bed['kind'][] = ['bed', 'raised-bed', 'container', 'greenhouse', 'coldframe', 'border', 'structure']

export default function Inspector({ bed, placement, node, snapStep, onBedChange, onRemoveBed, onQuantityChange, onUnplace }: InspectorProps) {
  if (bed) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <h2 className="text-sm font-semibold text-ink">Bed</h2>
        <Field label="Name">
          <input className={inputCls} value={bed.name} onChange={(e) => onBedChange({ name: e.target.value })} />
        </Field>
        <Field label="Kind">
          <select className={inputCls} value={bed.kind} onChange={(e) => onBedChange({ kind: e.target.value as Bed['kind'] })}>
            {BED_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width (m)">
            <SizeInput value={bed.width} min={0.3} step={snapStep || 0.1} onCommit={(w) => onBedChange({ width: w })} />
          </Field>
          <Field label="Height (m)">
            <SizeInput value={bed.height} min={0.3} step={snapStep || 0.1} onCommit={(h) => onBedChange({ height: h })} />
          </Field>
        </div>
        <Field label="Spacing">
          <div className="flex gap-1">
            {(['free', 'grid'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onBedChange({ spacing: m, cellSize: m === 'grid' ? bed.cellSize ?? 0.3 : bed.cellSize })}
                className={['flex-1 rounded-md px-2 py-1.5 text-sm font-medium capitalize', bed.spacing === m ? 'bg-brand text-onbrand' : 'bg-sunken text-muted hover:text-ink'].join(' ')}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>
        {bed.spacing === 'grid' && (
          <Field label="Cell size (m)">
            <input type="number" step="0.05" min="0.1" className={inputCls} value={bed.cellSize ?? 0.3} onChange={(e) => onBedChange({ cellSize: Math.max(0.1, parseFloat(e.target.value) || 0.3) })} />
          </Field>
        )}
        <p className="text-xs text-subtle">Or drag the corner handle to resize.</p>
        <button type="button" onClick={onRemoveBed} className="mt-1 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:border-line-strong hover:text-ink">
          Remove bed
        </button>
      </div>
    )
  }

  if (placement && placement.region) {
    const count = plantsInRegion(placement.footprint ?? 0.3, placement.region)
    return (
      <div className="flex flex-col gap-3 p-3">
        <h2 className="text-sm font-semibold text-ink">Planting</h2>
        <p className="text-sm font-medium text-ink">{node ? displayLabel(node) : placement.nodeId}</p>
        <p className="text-xs text-muted">
          Footprint {((placement.footprint ?? 0.3) * 100).toFixed(0)} cm · fits {count} at this size
        </p>
        <Field label="Quantity">
          <input type="number" min="0" className={inputCls} value={placement.quantity ?? count} onChange={(e) => onQuantityChange(Math.max(0, parseInt(e.target.value) || 0))} />
        </Field>
        <button type="button" onClick={onUnplace} className="mt-1 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:border-line-strong hover:text-ink">
          Take off the plot
        </button>
      </div>
    )
  }

  return (
    <div className="p-3 text-xs text-muted">
      Select a bed or a planting to edit it. Nothing selected.
    </div>
  )
}
