import type { Bed, Holding, PlacementShape, Rect } from '../../schema/userData'
import type { PlantNode } from '../../schema/plant'
import { displayLabel } from '../../lib/naming'
import { DEFAULT_CATEGORY_COLOR } from '../../lib/plantColor'
import { plantsInRegion } from '../../lib/spacing'
import { familyCommon } from '../../lib/taxonNames'
import { ROTATION_REST_YEARS, type BedRotation } from '../../lib/rotation'
import { Field, SizeInput, inputCls } from './fields'

// The inspector: edit the currently-selected bed or placement. A thin shell over the garden seam —
// every change is persisted by the callbacks the page wires to src/app/garden.ts. (Plot size is
// edited in its own modal — see PlotSizeModal.)

/** A planted row shown under a selected bed — colour swatch · name · count. */
export interface BedPlanting {
  id: string
  label: string
  color: string
  count: number
}

export interface InspectorProps {
  bed?: Bed
  placement?: Holding
  node?: PlantNode
  /** What's planted in the selected bed (empty unless a bed is selected). */
  bedPlantings?: BedPlanting[]
  /** Every bed on the plot — listed in the empty state so a full bed (hard to click through its
   *  plantings) can be selected from here instead. */
  beds?: Bed[]
  /** Bed ids with a crop-rotation warning — marked ⚠ in the empty-state bed list. */
  warnBedIds?: Set<string>
  /** Select a bed from the empty-state list (selects it on the plot + switches the inspector). */
  onSelectBed?: (id: string) => void
  /** The selected bed's crop-rotation picture for the active year (families + any clashes). */
  rotation?: BedRotation
  /** Snap increment (m) for typed bed sizes; 0 when snapping is off (a 0.1 spinner step is used). */
  snapStep: number
  /** The plant's default (category) colour — the swatch shown when there's no override. */
  placementDefaultColor?: string
  /** Select one of the bed's plantings (jumps to it on the plot). */
  onSelectPlanting?: (id: string) => void
  onBedChange: (patch: Partial<Bed>) => void
  onRemoveBed: () => void
  onQuantityChange: (qty: number) => void
  onPlacementShapeChange: (shape: PlacementShape) => void
  onPlacementResize: (region: Rect) => void
  /** Set (or clear, with `undefined`) the colour this planting is drawn in on the plot. */
  onPlacementColorChange: (color: string | undefined) => void
  onUnplace: () => void
}

const BED_KINDS: Bed['kind'][] = ['bed', 'raised-bed', 'container', 'patio', 'greenhouse', 'coldframe', 'border', 'structure']

const PLACEMENT_TYPES: { shape: PlacementShape; label: string }[] = [
  { shape: 'area', label: 'Area' },
  { shape: 'round', label: 'Pot' },
  { shape: 'rect', label: 'Single' },
]

/** A family's display name for the rotation note — "Cabbage family (Brassicaceae)", or just the
 *  scientific name when we have no common gloss. */
function familyLabel(family: string): string {
  const common = familyCommon(family)
  return common ? `${common} family (${family})` : family
}

export default function Inspector({ bed, placement, node, bedPlantings = [], beds = [], warnBedIds, onSelectBed, rotation, snapStep, placementDefaultColor = DEFAULT_CATEGORY_COLOR, onSelectPlanting, onBedChange, onRemoveBed, onQuantityChange, onPlacementShapeChange, onPlacementResize, onPlacementColorChange, onUnplace }: InspectorProps) {
  if (bed) {
    const conflicts = rotation?.conflicts ?? []
    return (
      <div className="flex flex-col gap-3 p-3">
        <h2 className="text-sm font-semibold text-ink">Bed</h2>
        {conflicts.length > 0 && (
          <div className="rounded-md bg-warn-soft p-2.5 text-xs text-warn-ink">
            <p className="font-semibold">⚠ Crop rotation</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {conflicts.map((c) => (
                <li key={c.family}>
                  <span className="font-medium">{familyLabel(c.family)}</span> grew here in {c.lastYear} (
                  {c.yearsAgo === 1 ? 'last year' : `${c.yearsAgo} years ago`}). Ideally rest {ROTATION_REST_YEARS} years
                  before replanting it.
                </li>
              ))}
            </ul>
          </div>
        )}
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
        {bedPlantings.length > 0 && (
          <div className="mt-1 border-t border-line pt-3">
            <h3 className="text-xs font-medium text-muted">In this bed</h3>
            <ul className="mt-2 flex flex-col gap-0.5">
              {bedPlantings.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPlanting?.(p.id)}
                    className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm hover:bg-sunken"
                  >
                    <span className="size-2.5 flex-none rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="min-w-0 flex-1 truncate text-ink">{p.label}</span>
                    <span className="shrink-0 tabular-nums font-medium text-muted">×{p.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button type="button" onClick={onRemoveBed} className="mt-1 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:border-line-strong hover:text-ink">
          Remove bed
        </button>
      </div>
    )
  }

  if (placement && placement.region) {
    const region = placement.region
    const shape = placement.shape ?? 'area'
    const count = plantsInRegion(placement.footprint ?? 0.3, region)
    const radius = Math.min(region.width, region.height) / 2
    const cx = region.x + region.width / 2
    const cy = region.y + region.height / 2
    return (
      <div className="flex flex-col gap-3 p-3">
        <h2 className="text-sm font-semibold text-ink">Planting</h2>
        <p className="text-sm font-medium text-ink">{node ? displayLabel(node) : placement.nodeId}</p>
        <Field label="Type">
          <div className="flex gap-1">
            {PLACEMENT_TYPES.map((t) => (
              <button
                key={t.shape}
                type="button"
                onClick={() => onPlacementShapeChange(t.shape)}
                className={['flex-1 rounded-md px-2 py-1.5 text-sm font-medium', shape === t.shape ? 'bg-brand text-onbrand' : 'bg-sunken text-muted hover:text-ink'].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>
        {shape === 'area' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Width (m)">
                <SizeInput value={region.width} min={0.1} step={0.1} onCommit={(w) => onPlacementResize({ ...region, width: w })} />
              </Field>
              <Field label="Height (m)">
                <SizeInput value={region.height} min={0.1} step={0.1} onCommit={(h) => onPlacementResize({ ...region, height: h })} />
              </Field>
            </div>
            <p className="text-xs text-muted">
              Footprint {((placement.footprint ?? 0.3) * 100).toFixed(0)} cm · fits {count} at this size
            </p>
            <Field label="Quantity">
              <input type="number" min="0" className={inputCls} value={placement.quantity ?? count} onChange={(e) => onQuantityChange(Math.max(0, parseInt(e.target.value) || 0))} />
            </Field>
          </>
        )}
        {shape === 'round' && (
          <Field label="Radius (m)">
            <SizeInput value={radius} min={0.05} step={0.05} onCommit={(r) => onPlacementResize({ x: cx - r, y: cy - r, width: 2 * r, height: 2 * r })} />
          </Field>
        )}
        {shape === 'rect' && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Width (m)">
              <SizeInput value={region.width} min={0.1} step={0.1} onCommit={(w) => onPlacementResize({ ...region, width: w })} />
            </Field>
            <Field label="Height (m)">
              <SizeInput value={region.height} min={0.1} step={0.1} onCommit={(h) => onPlacementResize({ ...region, height: h })} />
            </Field>
          </div>
        )}
        <Field label="Colour on plot">
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Colour on plot"
              value={placement.color ?? placementDefaultColor}
              onChange={(e) => onPlacementColorChange(e.target.value)}
              className="h-8 w-10 flex-none cursor-pointer rounded border border-line bg-card p-0.5"
            />
            <span className="flex-1 text-xs text-muted">
              {placement.color ? 'Custom — e.g. the real bloom colour' : 'Default (category colour)'}
            </span>
            {placement.color && (
              <button
                type="button"
                onClick={() => onPlacementColorChange(undefined)}
                className="flex-none rounded px-2 py-1 text-xs font-medium text-muted hover:bg-sunken hover:text-ink"
              >
                Reset
              </button>
            )}
          </div>
        </Field>
        <button type="button" onClick={onUnplace} className="mt-1 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:border-line-strong hover:text-ink">
          Take off the plot
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-xs text-muted">Select a bed or a planting to edit it. Nothing selected.</p>
      {beds.length > 0 && (
        <div className="border-t border-line pt-3">
          <h3 className="text-xs font-medium text-muted">Beds</h3>
          <ul className="mt-2 flex flex-col gap-0.5">
            {[...beds].sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelectBed?.(b.id)}
                  className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm hover:bg-sunken"
                >
                  <span className="min-w-0 flex-1 truncate text-ink">{b.name}</span>
                  {warnBedIds?.has(b.id) && (
                    <span className="flex-none text-warn-ink" title="Crop-rotation warning">
                      ⚠
                    </span>
                  )}
                  <span className="flex-none tabular-nums text-xs text-muted">
                    {b.width.toFixed(1)}×{b.height.toFixed(1)} m
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
