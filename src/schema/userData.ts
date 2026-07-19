// User/garden data — the precious, hand-entered layer whose durable backup is an
// exported JSON. Conceptual shapes; the Dexie stores mirror these.

import type { PlantNode, Guide, TaskTemplate } from './plant'

/** A rectangle in metres — either a bed on the plot canvas (plot-local, top-left origin) or a
 *  plant's placement within its bed (bed-local). Structurally matches `Rect` in `src/lib/plot.ts`
 *  and `Region` in `src/lib/spacing.ts`, so they interoperate without a schema→lib dependency. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** A spatial container on the garden-planner plot canvas — a bed / raised bed / container /
 *  greenhouse footprint you drop plants into. Rectangles only for MVP (polygons are Later).
 *  Precious user data: beds travel in the backup. See docs/garden-planner-spec.md. */
export interface Bed {
  id: string
  name: string
  /** Display + (Phase 3) date behaviour — a greenhouse/coldframe shifts sow/harvest windows;
   *  a path/structure is a bed you don't plant in. */
  kind: 'bed' | 'raised-bed' | 'container' | 'patio' | 'greenhouse' | 'coldframe' | 'border' | 'structure'
  /** Placement + size on the plot canvas, metres (top-left origin, +x right / +y down). */
  x: number
  y: number
  width: number
  height: number
  /** Rotation in degrees. Later — unused for MVP. */
  rotation?: number
  /** How plants dropped here are spaced: `grid` = square-foot cells; `free` = block packing. */
  spacing: 'grid' | 'free'
  /** Cell size in metres for `grid` beds (default ≈ 0.3 m, a 1 ft square-foot cell). */
  cellSize?: number
  notes?: string
}

/** How a placement occupies its region on the plot:
 *  - `area`  — a rectangle packed with many plants at their spacing (the default; veg blocks).
 *  - `round` — one plant occupying a circle of a set radius (pots / planters).
 *  - `rect`  — one plant occupying a rectangle (e.g. an espalier trained along a wall).
 *  Absent ⇒ `area` (back-compat with placements made before this field existed). */
export type PlacementShape = 'area' | 'round' | 'rect'

/** Something the user grows (or plans to). An *individual planting* — two apple trees are
 *  two holdings — so notes/photos/location attach per-instance, while the jobs they imply
 *  aggregate up the taxonomy into one de-duplicated list. A holding is also the garden-planner
 *  unit: when placed on a bed it gains the spatial fields below (a placement IS a holding —
 *  see docs/decisions.md), and an unplaced holding (no `bedId`) is just a flat-list entry. */
export interface Holding {
  id: string
  /** The reference `PlantNode` this planting is an instance of. */
  nodeId: string
  /** Optional user label to tell instances apart ("the tree by the shed"). */
  label?: string
  /** Where it is — free text, the fallback label for an unplaced holding (a placed one shows
   *  its bed name instead). */
  location?: string
  /** ISO date planted / sown, if known. */
  plantedOn?: string
  quantity?: number
  /** growing = in the ground now; planned = on the wishlist; archived = removed/finished. */
  status: 'growing' | 'planned' | 'archived'
  /** Personal cultivation notes — what you'd do differently, how it did. */
  notes?: string
  /** Local filenames for the user's own photos of this planting. */
  photos?: string[]

  // --- Garden-planner placement (all optional; absent = an unplaced/list holding) ---
  /** The `Bed` this planting sits in. Absent = unplaced. */
  bedId?: string
  /** The block it occupies within the bed (bed-local metres). An `area` crop fills this region and
   *  its `quantity` is packed from `footprint`; a single `round`/`rect` placement occupies the
   *  region as one plant (a `round` circle is inscribed in the region). */
  region?: Rect
  /** How the region is occupied — packed area (default) vs a single round/rect plant. */
  shape?: PlacementShape
  /** Spacing footprint (diameter, metres) — default derived from the node, hand-overridable. */
  footprint?: number
  /** Colour this block is drawn in on the plot (CSS hex, e.g. `#c084fc`) — an override so a flower
   *  can show its real bloom colour. Absent = the plant's category colour. */
  color?: string
  /** The plan year this placement belongs to (crop rotation + follow-on). Absent = current. */
  year?: number
}

/** A completed (or snoozed/skipped) job — builds a garden history from day one, the way
 *  Forkast's `cooked` does. Keyed loosely so both calendar-derived jobs and ad-hoc ones
 *  can be logged. */
export interface JobLog {
  id: string
  /** Stable key of the job that was actioned (e.g. `${nodeId}:${action}:${month}`). */
  jobKey: string
  holdingId?: string
  nodeId?: string
  date: string
  outcome?: 'done' | 'snoozed' | 'skipped'
  note?: string
}

/** Free-form key/value settings (e.g. `dataSource`, `region`, `lastFrost`). `dataSource`
 *  guards the first-run demo seed from clobbering real user data, exactly as in Forkast. */
export interface Setting {
  key: string
  value: unknown
}

/** The Save/Open backup envelope — a self-contained snapshot of *every* table, so it is a
 *  true restore point that needs no matching demo file. Unlike Forkast (whose reference data
 *  is disposable), Tilth's reference nodes/guides/tasks can be hand-authored or merge-imported,
 *  so they are precious and travel in the backup too — otherwise a restore would lose exactly
 *  the plants you added. Open restores by replacing all data wholesale (no tombstones — the
 *  saved set itself is the record of what was kept). */
export interface BackupSnapshot {
  /** v2 adds `beds` (the garden-planner layer). A v1 file (no `beds`) still restores — the
   *  parser normalises it up with an empty bed list. */
  version: 2
  exportedAt: string
  nodes: PlantNode[]
  guides: Guide[]
  tasks: TaskTemplate[]
  holdings: Holding[]
  beds: Bed[]
  jobLog: JobLog[]
  settings: Setting[]
}
