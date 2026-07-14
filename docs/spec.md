# Tilth — design spec

> A local-first **garden almanac + planner**. Keep a personal collection of plant
> **cheatsheets** — one scannable, image-dense page per plant, merged from several sources —
> record what you actually grow, and get the **month-by-month jobs** for the garden you have.

This is **living documentation**: it describes the app as it actually is and *why* it's
shaped that way. The decision trail lives in [`decisions.md`](decisions.md); the Gherkin
`features/` are the executable behaviour. Keep them honest — if code and a doc disagree, fix
the doc in the same change.

> **Status: DRAFT.** This is the first-pass design lifted from the discovery conversation and
> the developer's spreadsheet. Sections marked **⟲ Open** are unresolved and need a decision
> before the relevant code is written.

## Ethos & non-goals

- **Opinionated, not generic.** Built around one gardener's workflow — replacing a rich but
  laborious hand-maintained spreadsheet. Shared in case the approach is useful; not a
  general-purpose plant database.
- **Local-first.** No server, no account, nothing leaves your machine.
- **Public code, private data — always separated** (see *Privacy firewall*).
- **Cheatsheet, not encyclopaedia.** We hold a dense, scannable summary you can act on at a
  glance. Long prose guidance is *linked*, not re-hosted.

**Non-goals:** re-hosting third-party guidance prose; a social/sharing plant network; any
cloud sync or account system; being an authoritative botanical reference.

## Privacy firewall

Generic-input by design — source knowledge is data + config + a thin private adapter, never
committed code:

- **Committed (public):** the generic schema (`src/schema/`), the SPA, the generic lookup
  playbook + CLI, the public botanical vocabularies (family/genus taxonomy, phase &
  condition shortcodes), and **fictional** demo plants (`public/demo/`). `grep -ri <source>`
  over the repo — commit messages included — returns nothing.
- **Gitignored (local-only):** your real dataset + images (`data/private/`), the per-source
  config (`*.private.json`), and the clean/transform adapters (`adapters-private/`) that map
  one source's shape onto our schema. The SPA only ever sees our schema, never raw source
  payloads.

## Architecture

Two committed parts — the **SPA** and the generic **schema** — plus a **private, on-demand
lookup pipeline** that emits schema **fragments**.

1. **Lookup pipeline** (TypeScript + Node ≥22, run natively). Unlike Forkast's one-shot
   catalogue crawl, this is **inventory-first and incremental**: you name a plant → a private
   adapter fetches its page(s) from one or more sources → emits a *partial* fragment in our
   schema → the app **merges** it in. Run it again from another source to fill more fields.
2. **Dataset / fragments** (generic JSON in our schema + images). Demo set committed
   (`public/demo/`); real set gitignored.
3. **SPA** (React + Vite + TS). Import/merge fragments → IndexedDB → browse cheatsheets /
   record holdings / see jobs → export backup. Fully static; GitHub Pages or local.

### The merge model (the defining feature)

An import fragment is a **partial overlay**. For each record it touches:

- **Present field ⇒ overwrite. Absent field ⇒ leave the existing value alone.**
- A field is a whole top-level property: arrays (`soil`, `calendar`) and nested objects
  (`conditions`, `size`) **replace wholesale**, they do not union. (A source that supplies
  `soil` supplies the *complete* set it knows.)
- Every overwritten field is **stamped with provenance** — which `source` set it, the deep
  link, and when. So you can see "size came from the horticultural DB, sowing depth from the
  seed packet", and a deliberate re-import from a preferred source can win.

This is why lookups can be piecemeal: botanical facts from one source, sow/germination from
another, all landing on the same node without clobbering each other. See
[`decisions.md`](decisions.md) → *Property-level merge* and *Per-field provenance*.

**⟲ Open:** conflict policy when two sources set the *same* field. Default = last import
wins (+ provenance visible). Possible later: a per-source trust order, or a UI to pick.

### Hierarchy

Reference plants form a taxonomy: **family → genus → species → cultivar** (`PlantNode.rank`
+ `parentId`), plus informal `group`s ("fruit trees"). The gardener's holdings usually point
at a cultivar (or a species when the variety is unknown — the sheet's many `?` varieties).

Guidance and jobs **attach at a rank and aggregate down**: a job defined on "apples" applies
to every apple cultivar you grow; guidance on "fruit trees" shows on each fruit tree's page.
Conversely a cheatsheet can **inherit** unfilled fields from its parent (⟲ Open: inherit-vs-
show-blank — leaning "show own, offer parent's as fallback").

### The cheatsheet (the one-pager)

The core UI artefact — the developer's spreadsheet row, exploded into a scannable, image-
dense page. Design goals: **fast to scan, iconographic, information-dense**. It renders the
`PlantNode` — botanical chips, the 12-month calendar bar, seasonal colour, condition icons
(soil/moisture/pH/sun), size, and free `facts` chips (spacing, germination, depth). This is
where most design effort goes. **⟲ Open:** full visual design (needs the Tilth design system).

### Calendar → jobs

The 12-month calendar is stored as source-neutral **`PhaseSpan` shortcodes** (`sow-outdoors`,
`flower`, `harvest`, …), never colours — seed brands colour the same phases differently, so
the UI owns the code → colour + legend mapping.

- **Actionable** codes (`sow-*`, `pot-on`, `plant-out`, `prune`, `thin`, `divide`, `feed`,
  `harvest`) feed the **jobs engine**. **State** codes (`flower`, `foliage`, `fruit`) are
  display-only chart colour.
- The **job list** = for each holding, walk up its taxonomy, collect actionable phases +
  `TaskTemplate`s at every level, and **de-duplicate** so "prune apples" appears once even
  with two apple cultivars. Grouped by month; "this month" surfaced first.
- **⟲ Open:** location/climate shift. Sow/harvest months are region-sensitive. A `settings`
  region / last-frost could nudge windows. Deferred; note it so we don't bake in one climate.

## Data model

Reference shapes live in [`src/schema/plant.ts`](../src/schema/plant.ts); user shapes in
[`src/schema/userData.ts`](../src/schema/userData.ts). Summary:

### Reference (merge-imported, re-importable)

| Store   | Shape | Notes |
|---|---|---|
| `nodes` | `PlantNode` | a plant at any rank; merge target; carries the cheatsheet data + `provenance` |
| `guides` | `Guide` | linked (default) or held guidance, scoped to a node/category |
| `tasks` | `TaskTemplate` | month-scoped job templates beyond the calendar phases |

### User data (IndexedDB, exported as the durable backup)

| Store | Shape | Notes |
|---|---|---|
| `holdings` | `Holding` | individual plantings (growing / planned / archived); notes + photos per instance |
| `jobLog` | `JobLog` | done/snoozed/skipped jobs — builds garden history |
| `settings` | `Setting` | key/value; `dataSource='user'` guards the demo seed |

### Persistence model (inherited from Forkast)

- **Reference data** imports into IndexedDB as the fast working copy — always re-importable,
  never precious. Bundled fictional demo seeds first run; re-seeds on a `DEMO_VERSION` bump,
  but **never when `dataSource === 'user'`**.
- **User data** is precious; the durable source of truth is an **exported JSON backup**
  (Save / Open in Config — a self-contained snapshot of every table).
- **Images** are large and Safari evicts idle blobs, so (like Forkast) they're served from a
  private folder in dev and an in-app content-addressed image cache for the hosted app.
  **⟲ Open:** image model (hero + user photos) — design alongside the cheatsheet.

## MVP scope (proposed)

1. **Import / merge** a fragment (nodes/guides/tasks) into IndexedDB; ship a fictional demo
   set. Property-level overlay with provenance.
2. **Browse** the collection — by category (flower/fruit/herb/tree/veg), search, facets.
3. **Cheatsheet page** — the scannable one-pager per node, with the calendar bar + legend.
4. **Holdings** — record what you grow (individual plantings, location, planted date, notes,
   photos); a wishlist of planned plants.
5. **Jobs** — the aggregated month-by-month list for your holdings, with done-tracking.
6. **Guides** — linked guidance surfaced on the relevant cheatsheet; promote-to-held later.
7. **Export / Import** user data (backup / restore).

## Later (noted, not built)

- Region / last-frost adjustment of job windows.
- Held (offline/annotated) guides.
- Companion planting, succession sowing, crop rotation for veg beds.
- Bed/layout mapping (where things physically are).

## Open questions (consolidated)

- **⟲ Merge conflict policy** — last-wins vs source trust order vs manual pick.
- **⟲ Inheritance** — how much a cultivar cheatsheet borrows from its species/genus.
- **⟲ Region/climate** — how (and whether) to shift job windows to a locale.
- **⟲ Image model** — hero images + user photos, dev route + in-app cache.
- **⟲ Design system** — Tilth's own brand/tokens (Forkast's skill is the template).
- **⟲ Calendar granularity** — is per-month enough, or do some jobs need weeks/"when X"?
