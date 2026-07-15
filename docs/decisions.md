# Decisions

Cross-cutting design decisions and the reasoning behind them — the "how we got here" the
specs themselves don't carry. **Newest first.** Feature-local decisions live in their own
feature spec; private rationale (the real sources, personal curation rules) stays in
`HANDOVER.local.md`. Keep this **firewall-clean — no source names, ever** (see `CLAUDE.md`).

Each entry: the decision, *why*, and what it superseded if anything.

## 2026-07-14 — Founding: Tilth is built on the Forkast chassis

Tilth reuses Forkast's architecture wholesale — local-first, browser-only (IndexedDB via
Dexie), React 19 + Vite + TS + Tailwind v4, HashRouter, static hosting; the `src/schema` →
`src/lib` (pure) → `src/app` (Dexie use-cases) layering; the two-tier test harness (unit +
Gherkin against `fake-indexeddb`); the living-docs discipline (spec + ADRs + features); and
the **privacy firewall** (public generic code, gitignored private sources). *Why:* the chassis
is proven and the developer knows it; only the *domain* differs. Forkast lives at `../forkast`
as the readable template. What Tilth deliberately changes is captured in the ADRs below.

## 2026-07-14 — Property-level merge imports (present ⇒ overwrite, absent ⇒ keep)

Reference plant data is assembled from several sources over time, so an import is a **partial
overlay**, not a whole-record replace (Forkast's model). For each record a fragment touches:
present fields overwrite, absent fields are left untouched. A field is a whole top-level
property — arrays (`soil`, `calendar`) and nested objects (`conditions`, `size`) **replace
wholesale, they do not union**. *Why property-level:* it matches how the data actually
arrives — botanical facts from one source, sowing depths from a seed packet — letting lookups
be piecemeal without clobbering each other. *Why replace-not-union for arrays:* a source that
supplies `soil` supplies the *complete* set it knows; unioning would silently accumulate stale
values with no way to correct them. *Supersedes* Forkast's `bulkPut` whole-record upsert.

## 2026-07-14 — Per-field provenance

Every overwritten top-level field is stamped with a `FieldSource` (opaque `source` key, deep
`url`, `importedAt`) in the node's `provenance` map. *Why:* with multi-source merge you must be
able to answer "where did this value come from?" and let a deliberate re-import from a preferred
source win. It also keeps the firewall intact — the committed data stores an *opaque* source key
(`"plant-db"`, `"seed-packet"`), never a brand/URL in public data; the key→source mapping lives in
the private layer. **Open:** conflict policy when two sources set the same field (default: last-wins,
provenance visible; a source trust-order or manual pick may come later).

## 2026-07-14 — Hierarchy: one node type at any rank, jobs/guidance aggregate down

Reference plants are a taxonomy (`PlantNode.rank` ∈ family/genus/species/cultivar/group +
`parentId`), not a flat list. Guidance and job templates attach at a rank and **aggregate down**
to the specific cultivars a gardener holds; the job list walks each holding *up* its ancestry and
**de-duplicates** (two apple cultivars → one "prune apples" job). *Why one node type rather than
separate family/genus/cultivar tables:* the levels share the same cheatsheet fields and the
same merge/provenance machinery, and source content genuinely lives at every level. *Why not a
strict single tree:* real guidance (crop guides, techniques, pest/disease advice) attaches at
mixed levels and cross-cuts, so guides/tasks carry their own scope rather than living *in* the tree.

## 2026-07-14 — Link guides, hold cheatsheets

The only reference content we **hold** in full is the dense, scannable **cheatsheet** (the
structured `PlantNode` fields). Long-form prose guidance (grow-your-own guides, technique and
pest/disease articles) is **linked** (title + URL), promoted to held only on demand. *Why:*
re-hosting third-party prose invites drift (the source updates; our copy rots) and adds little the
gardener will re-read; the cheatsheet is the part worth having locally and at a glance. Holds
remain possible per-guide for offline/annotated cases.

## 2026-07-14 — Calendar stored as source-neutral phase shortcodes, colours owned by the UI

The 12-month calendar is a list of `PhaseSpan`s keyed by shortcode (`sow-outdoors`, `flower`,
`harvest`, …); **colours are never stored**. The UI maps code → colour + legend. *Why:* seed
brands colour the same phases differently, so colour is a presentation concern of *our* app, not
source data — storing a code keeps imports from different brands consistent and lets one legend
explain the chart. Actionable codes double as the input to the jobs engine; state codes
(flower/foliage/fruit) are chart-only.

## 2026-07-14 — Inventory-first, on-demand lookup (not a catalogue crawl)

Acquisition is inverted from Forkast: the gardener names the plants they have, and a private
adapter looks *those specific ones* up, emitting partial fragments to merge. *Why:* the useful set
is small and personal (what's in the garden), the sources are page-per-plant, and the merge model
wants small fragments anyway. There is no sitemap enumeration / bulk cull step; `scripts/ACQUIRE.md`
is rewritten around targeted lookup.

## 2026-07-15 — Hand-entered plants are just another merge source; edits overlay only changed fields

Adding or editing a plant by hand routes through the same property-level merge as an import,
stamped with the opaque source key `"manual"` (`src/app/editNode.ts`). *Why one path not two:*
manual entry and acquire enrichment must interleave on the same node without special-casing —
so a later `"plant-db"` import overlays cleanly and the diff shows a hand-typed value vs the incoming
one. **Edit overlays only the fields that actually changed** (`src/lib/editNode.ts` `nodeDiff`),
so a field a source set keeps its provenance rather than being re-stamped `"manual"` on every
save. *Deletion is the exception* — it has no provenance, so it's a direct store delete that also
marks the store user-owned (a demo re-seed must not resurrect it). Clearing a *scalar* field to
empty is not yet supported (the merge treats absent ⇒ leave-alone); arrays clear via an empty array.

## 2026-07-15 — `sourceLinks` on a node is the acquire worklist

A `PlantNode` carries `sourceLinks: {source,url,label?}[]` — the pages a gardener pastes when
adding/linking a plant, and the list an acquire reads to know what to fetch. *Why a first-class
field, distinct from `provenance[field].url`:* provenance records where a value *came from* after
the fact; `sourceLinks` is the *intent to enrich*, entered before any value exists. It rides in
the exported backup, so the backup doubles as the acquire worklist (no separate lookup file). A
URL here is user data (IndexedDB/backup, never committed); committed demo uses `example.invalid`.
