# Garden Planner — spec

_"My garden" grows up from a flat holdings list into a **visual garden planner** in the
spirit of a drag-and-drop plot designer: draw beds, drop plants at their correct spacing, see
how many you need, then get a planting calendar and rotation guidance off the layout you drew._

Status: **DRAFT / building Phase 1.** Prose here is the source of truth for design + rationale;
`features/garden-plan.feature` is the executable proof. Keep them honest (fix the doc in the
same change if code diverges).

## Why this shape

Two pillars a visual planner needs are already in the collection, effectively for free:

- **Crop rotation** is a function of botanical **family**, which every `PlantNode` carries — so
  "don't follow brassicas with brassicas" needs no new plant data, just the family roll-up we
  already do.
- **The planting calendar** is a function of the `PhaseSpan` calendar we already hold per node —
  the jobs engine just reads it for the plants you've placed.

The genuinely new thing is a **spatial layer**: where things physically are. That is a plot
canvas, beds on it, and plants placed within beds with a spacing footprint that yields a count.

## Two settled architectural calls

See `docs/decisions.md` for the ADR. In short:

1. **A placement _is_ a holding** (unify, not a separate plan layer). Dropping a plant on a bed
   creates/updates a `Holding` that gains spatial fields (`bedId`, `region`, `footprint`). One
   record is both "what I'm growing" and "where it is". The alternative — a separate per-year
   Plan entity — was rejected as a second parallel store to keep in sync; a holding's `year` +
   `status` carry the planning dimension instead.
2. **Beds support both spacing models**, chosen per bed: a **square-foot grid** (cells of a fixed
   size, N plants per cell by density) _and_ **free spacing** (drop a block, its area ÷ the
   plant's footprint gives the count). Grid suits tidy raised beds; free suits borders, rows,
   and trees.

## Data model

### New store: `beds`

A spatial container placed on the shared plot canvas. Rectangles only for MVP (polygons noted
as Later — rectangles cover raised beds, containers, greenhouse footprints, rows).

```ts
interface Bed {
  id: string
  name: string                       // "Raised bed 1", "Greenhouse"
  kind: 'bed' | 'raised-bed' | 'container' | 'greenhouse' | 'coldframe' | 'border' | 'structure'
  // Placement on the plot canvas — metres, top-left origin, +x right / +y down.
  x: number; y: number
  width: number; height: number
  rotation?: number                  // degrees; Later
  spacing: 'grid' | 'free'           // which model plants in this bed use
  cellSize?: number                  // metres; grid beds only (default 0.3 ≈ 1 ft SFG cell)
  notes?: string
}
```

`kind` is display + (Phase 3) date behaviour — a `greenhouse`/`coldframe` shifts sow/harvest
windows earlier. A `path`/`structure` is a bed you don't plant in. No new vocabulary is stored
as colour (same discipline as the calendar).

### `Holding` gains a spatial placement

Additive, all optional — an unplaced holding (absent `bedId`) is exactly today's flat-list
entry, so the wishlist/list view still works.

```ts
interface Holding {
  // ...existing: id, nodeId, label?, location?, plantedOn?, quantity?, status, notes?, photos?
  bedId?: string                     // which bed it sits in; absent = unplaced
  region?: { x: number; y: number; width: number; height: number }  // bed-local metres
  shape?: 'area' | 'round' | 'rect'  // how the region is occupied; absent = area
  footprint?: number                 // spacing diameter (m); default from the node, overridable
  year?: number                      // plan year (rotation + follow-on); absent = current
}
```

A placement occupies its `region` one of three ways (`shape`):
- **`area`** (default) — a block packed with many plants at their `footprint`; `quantity` derived
  (grid beds snap `region` to whole cells). Suits veg.
- **`round`** — one plant in a **circle** inscribed in the (square) region; a set radius. Suits
  pots / planters.
- **`rect`** — one plant filling a **rectangle** (e.g. an espalier trained along a wall).

`quantity` is stored (survives, hand-overridable) and is exactly `1` for a single round/rect.
`placementCount(shape, footprint, region)` in `src/lib/spacing.ts` is the pure count rule. The
brush mode in the palette picks the shape when placing; the inspector can switch an existing
placement's type. Absent `shape` on older placements reads as `area`, so nothing pre-dating this
changes.

`location` (existing free text) stays as a fallback label for unplaced holdings; a placed
holding shows its bed name instead.

### Persistence

- Dexie **`version(2)`**: add `beds: 'id'`; add a `bedId` index to holdings
  (`holdings: 'id, nodeId, status, bedId'`). The new `Holding` fields are non-indexed, so no
  data migration — old records simply lack them.
- **Backup `version: 2`** — the snapshot gains `beds: Bed[]`. `parseBackup` stays tolerant: a v1
  backup restores with `beds: []`. Beds are precious user data (they travel in the backup).

## Pure libs (unit-tested, no Dexie/IO)

- **`src/lib/spacing.ts`** — the spacing math.
  - `footprintOf(node)` → spacing diameter in metres, from an explicit spacing fact if present,
    else derived from the node's `size.spread`, else a sane default. (Spacing is really the
    seed-packet half of the merge; until that lands we derive from spread + allow an override.)
  - `plantsInRegion(footprintM, region)` → integer count for free beds (hex/grid packing → use
    simple square packing `floor(w/f) * floor(h/f)`, documented as an approximation).
  - `plantsPerCell(footprintM, cellM)` and `gridCount(...)` → SFG density for grid beds.
- **`src/lib/plot.ts`** — geometry: snap-to-grid, bed/region clamping, overlap test, cell↔metre
  conversion. Keeps the canvas component dumb.

## App seam (Dexie use-cases)

**`src/app/garden.ts`** — the seam the UI _and_ the feature tests drive (React stays a thin
shell), marking `dataSource='user'`:

- `addBed`, `updateBed`, `removeBed` (removing a bed unplaces its holdings, doesn't delete them).
- `placePlant(nodeId, bedId, region)` → creates/updates a `Holding` with derived `footprint` +
  `quantity`.
- `movePlacement`, `resizePlacement`, `unplace`, `setQuantity`.
- `listBeds`, `holdingsInBed`, `plotSummary` (shopping-list counts per plant).

## UI — phased

### Phase 1 — the plot canvas (this build)

`GardenPage` becomes the planner. **Pointer-events based, not HTML5 drag-and-drop** (Safari is
the reference target; pointer events are the reliable cross-browser path).

- **`PlotCanvas`** (SVG) — a metre grid background, pan + zoom, top-left origin.
- **Beds** — add a rectangular bed; move + resize; pick `kind` + spacing model; grid beds render
  their cells.
- **Palette** — a sidebar of your holdings + a search into Browse to add a new plant; drag onto a
  bed to place it. The placement shows its footprint + auto count.
- **Inspector** — select a bed or a placement to edit (name/spacing/kind; quantity/notes/remove).
- **Shopping list** — total plant counts across the plan (`plotSummary`).

Components under `src/components/plot/`. Placeholder domain palette (literal hexes behind theme
tokens where they exist), brand pass later — same rule as the cheatsheet.

### Phase 2 — the plan-driven calendar + rotation

- **Jobs engine** (`src/lib/jobs.ts`) — for every placed holding, walk its taxonomy, collect
  actionable `PhaseSpan`s + `TaskTemplate`s, de-duplicate, group by month, surface "this month".
- **Crop-rotation warning** — flag a bed whose `year N` family repeats `year N-1` (uses the
  family roll-up; history comes from `year`-stamped holdings).
- Region/frost nudge stays deferred (a `settings` region shifts windows) — noted, not baked in.

### Phase 3 — succession + companion + follow-on year

- **Succession** — from each placement's occupancy window, show when a bed frees up.
- **Companion** — needs a new generic data layer (firewall: our own vocabulary, no sourced
  text/URLs); good/bad neighbours flagged on placement.
- **Follow-on year** — clone this year's plan into next year as a starting point.
- Structures (`greenhouse`/`coldframe`) shift a placement's sow/harvest dates.

### Phase 4 — journal + reminders

- Garden **journal** (per-holding dated notes/photos, harvest quantities) building on `jobLog`.
- A last-backup / task **nudge** surface (the deferred `backupNudge` pattern generalises).

## Testing

- **Unit** — `spacing.ts`, `plot.ts` geometry (packing counts, grid density, snapping, overlap).
- **Gherkin** — `features/garden-plan.feature`: add a bed → place a plant (a holding is created
  with `bedId` + `region`, count derived from footprint) → move it → set quantity → remove a bed
  unplaces (not deletes) its holdings → `plotSummary` totals. Drives `src/app/garden.ts` against
  `fake-indexeddb`, per the house harness.

## Open questions (⟲)

- **Spacing source** — until the seed-packet half lands, `footprintOf` derives spacing from
  `size.spread`. Is spread a good-enough proxy, or do we want an explicit `spacing` fact on the
  node now?
- **Packing model** — square packing under-counts vs hex/staggered (as SFG assumes). Square is
  simpler and conservative; revisit if counts feel low.
- **Plot scale / bounds** — one fixed canvas, or multiple named plots (front/back garden)? MVP: a
  single plot; multiple noted as Later.
- **Polygon / L-shaped beds** — rectangles only for MVP.
