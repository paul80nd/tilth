# Jobs page — whole-garden maintenance, month by month

Status: **built 2026-07-20** (v1), then **pivoted to plant-first display** the same day after a
density review (see the Display-model note below). This is the cross-garden counterpart to the
per-plant **Care tile** on the cheatsheet: every held plant's maintenance jobs, rolled up,
de-duplicated, and laid out by month with "this month" up top.

Read alongside `docs/spec.md` (data model) and the jobs engine in `src/lib/jobs.ts`.

## Why

The per-plant Care tile answers "what does *this* plant need?". This page answers "what does my
**whole garden** need, and when?" — the reminder surface for the maintenance you'd otherwise
forget (winter-prune, thin fruitlets, mulch), across everything you grow, in one scannable list.

## What already exists (do not rebuild)

- **`buildJobs` → `listJobs`** (`src/lib/jobs.ts`, `src/app/jobs.ts`) already produce a
  `JobCalendar`: 12 month buckets + an `anytime` bucket. Each `Job` is **de-duplicated per
  crop-scope** and carries `key`, `action`, `subjectId`, `subjectName`, `note`, `months`,
  `holdingIds`. The taxonomy roll-up + de-dupe (prune "Apple" once across two apple trees) is done.
- **`CheatsheetModal`** (`src/components/CheatsheetModal.tsx`) — `{ id, onClose }`, opens a plant's
  full cheatsheet in a portal modal (Esc / backdrop / ✕, body-scroll lock). Reuse as-is for
  click-through.
- **`categoryColor(node)`** (`src/lib/plantColor.ts`) — per-category placeholder hex for the dot.
- **`MONTH_NAMES`** (`src/lib/calendar.ts`); current month = `new Date().getMonth() + 1` **in the
  page only** (see `BrowsePage.tsx`/`Cheatsheet.tsx` for the `CURRENT_MONTH` pattern) — never in the
  pure lib, which stays date-free and deterministic.

## Scope of v1

**Display-only.** No done/snooze yet (deferred model at the foot of this doc). The page is a
read-only, reactive view of the rolled-up list.

**Growing-only.** `buildJobs` defaults to holdings with status `growing`; wishlist (`planned`) and
finished (`archived`) plantings are excluded, and a task reaching none of your held plants is
dropped. Jobs are for what's actually in the garden — nothing else.

**As-needed jobs are season-bounded (added 2026-07-20).** A `TaskTemplate` with no months (e.g.
"water in dry spells", "net against birds", "pinch out sideshoots") used to land wholesale in
**Anytime**. But most such jobs have an *implicit* season — you don't tend a cucumber in December.
So `buildJobs` now bounds a monthless task to the **union of the active months** of the held plants
it reaches, taken from each plant's own-or-inherited **calendar** (`activeSeason`). Only a genuinely
bounded season (1–11 months) clamps; a plant with **no calendar**, or one active all year (an
evergreen), leaves the job **truly Anytime**. Explicit-month tasks are untouched. This is inference
from data you already hold — no re-import — and self-heals as the seed-packet source fills in more
calendars. On the current backup: 61 of 86 as-needed jobs clamp to a season, 25 stay Anytime.
_Possible later refinement:_ phase-precise windows (net-against-birds → fruiting months only) rather
than the whole-season union; deferred as a fragile keyword exercise.

## Display model

> **Pivoted to plant-first, 2026-07-20 (post-build).** The first cut grouped **action-first**
> (parent = task, children = per-crop rows, identical jobs collapsing). Paul found it busy even at a
> modest plant count: a bold action heading over a single crop, repeated, plus a full note-sentence
> on every row. We flipped to **plant-first** (one row per plant listing its jobs) and moved notes
> off by default. The shared-job collapse (the action-first payoff) barely fired for a small garden,
> so little was lost. The old `groupJobs` / `JobRow` / `JobActionGroup` are gone.

Within any bucket, group the flat `Job[]` **by the plant** (`subjectId`):

1. **One row per plant** — a category colour **dot** (`categoryColor`), the plant name, then the
   distinct **actions** it needs that bucket, joined `·`.
2. The plant name is **clickable → `CheatsheetModal`** on its `subjectId` — that's where the full
   how-to lives (the Care tile). Notes are demoted: each action carries its `note` as a hover
   tooltip, not inline text.
3. Rows sort by **category then name** (a stable, colour-clustered order); actions within a row
   sort by name.
4. A genus/category-scoped job stays **one subject** (not expanded per cultivar) — matching
   `buildJobs`; clicking it opens the genus cheatsheet where the shared care lives.

### New pure helper (`src/lib/jobs.ts`, unit-tested)

```ts
/** One maintenance action a plant needs in a bucket. `note` = the how-to (shown on demand);
 *  `keys` = the underlying Job keys (stable ids for the future done-log). */
export interface PlantAction {
  action: string
  note?: string
  keys: string[]
}

/** A plant-first display row: one subject and the distinct actions it needs this bucket. */
export interface PlantJobs {
  subjectId: string
  subjectName: string
  category?: Category
  actions: PlantAction[]
}

/** Group a bucket's flat jobs by the plant they're about, for a plant-first display. Pure. */
export function groupJobsByPlant(jobs: Job[]): PlantJobs[]
```

- Group by `subjectId`; within, sub-group by `action` (same action twice on one plant merges,
  keeping both `keys`).
- Sort subjects by (category, name); sort actions by name.
- `note` rides on each action (hover tooltip); `keys` are the underlying `Job.key`s (done-log).

### Engine tweak (small, additive)

Add **`subjectCategory?: Category`** to the `Job` interface and set it in `buildJobs`
(`resolveCategory(subjectId, byId)` — the resolver already exists). This lets `groupJobs` and the
page colour/sort by category without the page loading the whole `nodes` table. Additive field →
update `src/lib/jobs.test.ts` and, if asserted, `features/jobs.feature`.

## Page — `src/pages/JobsPage.tsx`, route `/jobs`, tab **"Jobs"**

- Reactive: `useLiveQuery(() => listJobs())`. `const CURRENT_MONTH = new Date().getMonth() + 1`.
- Layout, top to bottom:
  1. **"This month — {MonthName}"** — pinned, always-open card, `groupJobsByPlant(this month's jobs)`.
     Empty → a quiet "Nothing to do."
  2. **The year** — the other 11 months in calendar order Jan→Dec (omit the current month; it's the
     pinned card above), each a **collapsed `<details>` disclosure** (Safari-safe, no JS) with a
     **job count** on the tab so you needn't open an empty one. Body is its `groupJobsByPlant(...)`.
  3. **Anytime** — the `anytime` bucket, same collapsed disclosure, at the very bottom (condition-based
     jobs like "water in dry spells" have no fixed month; kept out of "this month" to keep it crisp).
- **Wide screens:** rows flow into **two masonry columns** (`lg:columns-2` + `break-inside-avoid`).
- **Modal:** `const [openId, setOpenId] = useState<string | null>(null)`; clicking a plant sets it;
  render `{openId && <CheatsheetModal id={openId} onClose={() => setOpenId(null)} />}`.
- Full-bleed vs `Padded`: an ordinary scrolling page — route it inside `Padded` like Browse/Data
  (not full-bleed like Taxonomy/Garden).
- Header nav: add a **"Jobs"** `<Tab to="/jobs">` in `App.tsx` (in the primary group, next to
  "My garden").

## Testing

- **Unit** (`src/lib/jobs.test.ts`): `groupJobsByPlant` — a plant's actions grouped + sorted with
  notes kept; one row per plant (shared action not collapsed); same-action-on-one-plant de-dupe
  merging keys; category-then-name ordering; empty input. Plus `buildJobs` tags `subjectCategory`.
- **Gherkin** (`features/jobs.feature` + `features/steps/jobs.steps.ts`): scenarios driven through
  the lib — a plant's jobs group under it (one row, N actions); each plant is its own row (a shared
  "Water in dry spells" is *not* collapsed). Steps call `listJobs` then `groupJobsByPlant`. _Runner
  gotchas:_ no `{float}` param; each step **line** needs its own keyword+pattern (duplicate `And`
  text across a scenario collides — hence "…also includes the job"); keep example inputs quote-free.

## Cadence + tick-off (built 2026-07-20, Stage 1)

> **Why the original "tick everything" idea was dropped.** Trying to tick every job off is
> pointless for the ~half that are **continuous** ("water regularly", "weed", "deadhead" — you'll
> just do them again next week). Only **one-off** jobs ("winter-prune", "thin fruitlets", "divide
> clumps") have a meaningful "done for this year". The two aren't reliably inferable from the action
> text (heuristic misfires: "pinch out flower buds" reads continuous, "support if flopping" is
> conditional), so cadence is an **explicit field** the source sets.

- **Schema:** `TaskTemplate.cadence?: 'once' | 'ongoing'` — `once` = a discrete one-off (tickable);
  `ongoing` = continuous care (reminder only). **Absent ⇒ treated as `ongoing`**, so nothing is ever
  wrongly tickable before classification. Carried through `buildJobs` onto `Job.cadence`.
- **Page:** within each bucket the jobs split into **To do** (`cadence === 'once'`) and **Ongoing
  care** (everything else). The two subheadings only show when *both* kinds are present (an
  all-ongoing month stays a plain list). Only **This month's** To-do actions are tickable.
- **Tick-off:** click a one-off action → strikethrough; click again → back. Persisted in `jobLog`
  keyed by `jobDoneKey(period, subjectId, action)` = `${YYYY-MM}:${subjectId}:${action}` (the row
  id, so toggle is a get/delete). Period is **year+month**, so next year's same month starts fresh —
  no "Clear" button or auto-reset machinery needed. Seam: `toggleJobDone` / `listDoneKeys`
  (`src/app/jobs.ts`); pure key helper `jobDoneKey` (`src/lib/jobs.ts`).

### Stage 2 — populate `cadence` (data, TODO)

The engine + UI are live but **every task is currently unclassified** (`cadence` absent ⇒ all show
as Ongoing care, To-do is empty). Populate by classifying the ~123 distinct actions (see the
`cadence` analysis in chat: ~62 one-off, ~44 continuous, ~17 ambiguous) into a fragment. Because
tasks import as **whole-record upsert** (not field-merged — see `importReview.ts`), the fragment
re-emits full task records with `cadence` added; Paul reviews via the Data → Import diff gate.

### Later polish (still deferred)

- **Done jobs sink to the bottom** of the To-do list (currently they just strike in place). Pure
  ordering helper + unit test when wanted.

## Known display notes

- **Genus-scoped subjects** (roses→`rosa`, mint→`mentha`, strawberry→`fragaria`, peppers→`capsicum`,
  Dahlia/Dianthus/Nemesia/Verbena/Viburnum→their genus — see the care-acquire fan-out) mean clicking
  that subject opens the **genus** cheatsheet, where the shared care tasks live. Expected, not a bug.
- Same-common-name species (were two "Mint"/"Pepper"/"Basil") are now scoped so each renders as one
  subject; the historical duplicate-label wart is moot for maintenance jobs.
