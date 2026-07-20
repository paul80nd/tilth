# Jobs page — whole-garden maintenance, month by month

Status: **specified, not built** (design agreed 2026-07-20). This is the cross-garden counterpart
to the per-plant **Care tile** on the cheatsheet: every held plant's maintenance jobs, rolled up,
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

## Display model

Within any month bucket, group the flat `Job[]` for display:

1. **Parent = the general task** — group by `action` (e.g. "Winter prune").
2. **Child rows = the exact per-crop job** — within an action group, sub-group by `note` (exact
   match). Each row = one distinct note shared by 1+ crops, listing the crop **subjects**. So crops
   whose job is *identical* (same action **and** same note) collapse into one row listing the names
   (keeps generic jobs like "Water in dry spells" from sprawling into a row per crop); crops with a
   crop-specific note each get their own row under the shared action heading.
3. Each subject name is **clickable → `CheatsheetModal`** on its `subjectId`.
4. Each subject row carries a small **category colour dot** (`categoryColor`); groups sort by
   category then action (Q4 resolution — category is a dot + sort key, **not** a nesting level,
   because an action like "Water in dry spells" spans categories).

### New pure helper (`src/lib/jobs.ts`, unit-tested)

```ts
/** One displayed row within an action group: a single distinct job (note) shared by ≥1 crop. */
export interface JobRow {
  note?: string
  /** Crops this exact job covers — de-duped by id, sorted by name; each links to its cheatsheet. */
  subjects: { id: string; name: string; category?: Category }[]
  /** Underlying Job keys (stable ids for the future done-log). */
  keys: string[]
}

/** A month's jobs grouped by action (the general task), each holding ≥1 row. */
export interface JobActionGroup {
  action: string
  rows: JobRow[]
}

/** Group a month bucket's flat jobs into action → rows for display. Pure; date-free. */
export function groupJobs(jobs: Job[]): JobActionGroup[]
```

- Group by `action`; within, sub-group by `note` (treat `undefined` as its own key).
- `subjects` = distinct `{ subjectId, subjectName, subjectCategory }` sorted by name.
- `keys` = the underlying `Job.key`s (for the future done-log).
- Sort rows within a group (by first subject name), and groups by (first subject's category, then
  action) for a stable, category-clustered order.

### Engine tweak (small, additive)

Add **`subjectCategory?: Category`** to the `Job` interface and set it in `buildJobs`
(`resolveCategory(subjectId, byId)` — the resolver already exists). This lets `groupJobs` and the
page colour/sort by category without the page loading the whole `nodes` table. Additive field →
update `src/lib/jobs.test.ts` and, if asserted, `features/jobs.feature`.

## Page — `src/pages/JobsPage.tsx`, route `/jobs`, tab **"Jobs"**

- Reactive: `useLiveQuery(() => listJobs())`. `const CURRENT_MONTH = new Date().getMonth() + 1`.
- Layout, top to bottom:
  1. **"This month — {MonthName}"** — pinned card, `groupJobs(calendar.months[CURRENT_MONTH-1].jobs)`.
     Empty → a quiet "Nothing to do this month."
  2. **The year** — the other 11 months in calendar order Jan→Dec (omit the current month; it's the
     pinned card above), each a block with its `groupJobs(...)` (or "Nothing to do"). A month with
     no jobs still renders its header so positions stay familiar.
  3. **Anytime** — the `anytime` bucket, grouped the same way, at the very bottom (condition-based
     jobs like "water in dry spells" have no fixed month; kept out of "this month" to keep it crisp).
- **Modal:** `const [openId, setOpenId] = useState<string | null>(null)`; clicking a subject sets it;
  render `{openId && <CheatsheetModal id={openId} onClose={() => setOpenId(null)} />}`.
- Full-bleed vs `Padded`: an ordinary scrolling page — route it inside `Padded` like Browse/Data
  (not full-bleed like Taxonomy/Garden).
- Header nav: add a **"Jobs"** `<Tab to="/jobs">` in `App.tsx` (in the primary group, next to
  "My garden").

## Testing

- **Unit** (`src/lib/jobs.test.ts`): `groupJobs` — action grouping; identical-note collapse into one
  multi-subject row; distinct notes stay separate rows under the shared action; subject de-dupe +
  sort; group/row ordering; empty input.
- **Gherkin** (`features/jobs.feature` + `features/steps/jobs.steps.ts`): a scenario for the grouped
  view driven through the lib — e.g. two crops sharing an identical "Water in dry spells" job
  collapse to one row listing both; two crops with the same action but different notes show two rows
  under one "Winter prune" heading. Steps call `listJobs`/`buildJobs` then `groupJobs` (both pure/app
  seams the runner already drives). _Runner gotchas:_ no `{float}` param; each step **line** needs
  its own keyword+pattern (duplicate `And` text across a scenario collides); keep example inputs
  quote-free.

## Deferred — the "mark done" follow-up (v1.1)

Captured so v1 is built compatibly (`Job.key` is already the stable handle):

- **Tick a dated job → strikethrough + sinks to the bottom of its month** (stays visible, not
  removed). Only the **dated/monthly** jobs get a done tick; the **Anytime** jobs don't.
- **Per-month "Clear"** button resets that month's ticks. For now the reset is **manual** — you tick
  Clear when the month comes round again; no auto-reset per cycle yet.
- Persist in the `jobLog` table keyed by `(jobKey, period)` where period is the month (or year+month)
  the job was done in. New app seam (`markJobDone` / `clearMonth`) + a Gherkin scenario; the pure
  ordering (done jobs to the bottom) is a lib helper with unit tests.

## Known display notes

- **Genus-scoped subjects** (roses→`rosa`, mint→`mentha`, strawberry→`fragaria`, peppers→`capsicum`,
  Dahlia/Dianthus/Nemesia/Verbena/Viburnum→their genus — see the care-acquire fan-out) mean clicking
  that subject opens the **genus** cheatsheet, where the shared care tasks live. Expected, not a bug.
- Same-common-name species (were two "Mint"/"Pepper"/"Basil") are now scoped so each renders as one
  subject; the historical duplicate-label wart is moot for maintenance jobs.
