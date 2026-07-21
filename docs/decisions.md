# Decisions

Cross-cutting design decisions and the reasoning behind them — the "how we got here" the
specs themselves don't carry. **Newest first.** Feature-local decisions live in their own
feature spec; private rationale (the real sources, personal curation rules) stays in
`HANDOVER.local.md`. Keep this **firewall-clean — no source names, ever** (see `CLAUDE.md`).

Each entry: the decision, *why*, and what it superseded if anything.

## 2026-07-21 — Companion planting: our own taxonomy-keyed ruleset, same-bed, good + bad

Planner Phase 3's companion feature — flag which plants help or hinder each other in a bed.

- **The data is ours, keyed to the taxonomy.** Companion relationships are generic, widely-published
  horticultural knowledge (like the botanical taxonomy and phase vocabularies), so — per the privacy
  firewall — they're a **committed ruleset authored in our own words** (`src/lib/companions.ts`,
  `COMPANION_RULES`), naming no source and copying no proprietary chart. Each rule pairs two
  `TaxonKey`s (`{family}` / `{genus}` / `{category}`) with a `good`/`bad` relation; matching resolves
  a held plant's own-or-inherited family/genus/category (the shared `resolveUp` in `taxonomy.ts`,
  now used by the jobs/rotation/companion engines), so a rule on `genus: 'Allium'` reaches every
  onion/leek cultivar and de-dupes. Rules are **symmetric** (stored once).
- **Same-bed proximity (MVP).** Only plants sharing a bed are companions — simple, matches the
  per-bed rotation model, no geometry. Adjacency between beds is a later option.
- **Both good and bad.** The positive half ("plant these together") is the more motivating side, so
  we surface good pairings (green ✓) as well as clashes (amber ⚠) — not warn-only like rotation.
- **Distinct plot mark.** A bad-companion bed gets a "no" badge (circle + slash, bottom-left),
  deliberately a different shape/corner/symbol from the rotation triangle (top-right) so the two
  don't blur; the reasons live in the inspector. Reuses the `warn` colour token.

Deferred: a cheatsheet companions card and place-time (as-you-draw) hints.

## 2026-07-21 — Crop rotation: a plan-year dimension on the plot, warn by family, veg-only

The garden planner's Phase 2 rotation warning needed a *previous* year to compare against, but the
plot had no year dimension in use (`Holding.year` existed in the schema, unused). Three calls:

- **The plot is now plan-year-scoped.** The Garden page carries an active plan year (a
  localStorage editing preference, like zoom/lock-beds, defaulting to the clock year); placements
  are stamped with it, and the canvas / shopping list / rotation show that year. A holding's
  *effective* year is `holding.year ?? currentYear` — so every pre-existing (un-stamped) placement
  reads as this year's and nothing changes visually. *Why not a separate per-year Plan entity:*
  same reason a placement is a holding — one store, `year` carries the planning dimension.
- **Roll-over pulled forward from Phase 3.** Rotation is inert without a second year, and hand-
  entering one is tedious, so a minimal "copy year N → N+1" (`rollOverYear`, clones placements as
  fresh `planned` holdings; won't clobber a year that already has any) ships now. The richer
  follow-on-year work (succession, companion) stays Phase 3.
- **Warn by botanical family, veg-in-soil-beds-only, on a rest window.** The engine
  (`src/lib/rotation.ts`, pure) rolls each holding up to its own-or-inherited `family` (free —
  `family` is already an inheritable field) and flags a family that returns to a bed within
  `ROTATION_REST_YEARS` (default **3** — the classic four-bed rotation rests a group ~3 years; the
  future settings seam). Two gates on what counts:
  - **The plant** — only **veg that isn't exclusively perennial** (you don't rotate a fruit tree or
    a perennial herb; unknown lifecycle is treated as annual, since lifecycle data is sparse and
    excluding it would silently drop most veg).
  - **The bed** — only **soil beds that carry over year to year** (`ROTATING_BED_KINDS`:
    `bed`/`raised-bed`/`border`/`greenhouse`). Containers, patio and coldframes hold pots that get
    fresh compost, and a `structure` isn't planted — nothing accumulates, so they never warn. A
    greenhouse *is* in: its border soil builds up soil-borne disease like open ground.

  A holding whose family is unknown is skipped, not guessed.

Surfaced as an amber outline + ⚠ badge on the bed (a new `warn` semantic colour token — the app's
first caution state, placeholder like the rest), a toolbar count, and the offending families +
years in the inspector when a warned bed is selected.

## 2026-07-19 — Family/genus common names: committed defaults + editable user overrides

The plain-language names that gloss the Taxonomy banners ("Rose family · Rosaceae") and the new
family gloss ("…strawberries, apples, roses and brambles") come from two hard-coded maps in
`src/lib/taxonNames.ts` (`FAMILY_COMMON` / `GENUS_COMMON`). The gardener can now **override or
add** to them on the Data page. *Why overrides over migrating the vocabulary into a store:* the
maps are generic public taxonomy (firewall-safe, and the demo relies on them), so they stay in
committed code as the defaults; a settings-backed `CommonNameOverrides` (`{families,genera}`, keyed
by *scientific* name, `src/app/taxonNames.ts`) overlays purely additively — no migration, the
defaults survive, and edits travel in the backup like any other setting. The pure lookups
(`familyCommon`/`genusCommon`/`genusPlural`/`bannerParts`/`genusGloss`) take an optional
`overrides` arg (override wins, default is the fallback) so they stay pure and the only consumer
(`TaxonomyPage`) reads the overrides via `useLiveQuery`. **Plurals are derived** by a naive
`pluralize` (regular English: sibilant→-es, consonant+y→-ies, else -s — every current genus name is
regular) with an optional explicit `plural` per genus for an eventual irregular. Saving an override
marks the store user-owned (consistent with every other user write). *Alternative rejected:*
storing the whole vocabulary as user data seeded from the maps — cleaner single-source but a real
migration + demo-seeding for no gain while the maps are the trustworthy baseline.

## 2026-07-19 — Split `position` out of `conditions` (independent inheritance)

`PlantNode` now carries **two** growing-environment fields: `conditions` (soil / moisture / pH)
and `position` (light / aspect / exposure / hardiness). *Why split what used to be one
`conditions` object:* inheritance and provenance are **per top-level field** (a whole field is
borrowed or owned; a whole field carries one source). With both cards on one field, a node that
set *anything* — even just its own hardiness — stopped inheriting the *whole* thing, so its soil
went blank; and editing one card silently baked in the other's inherited values. Splitting lets a
node inherit its parent's position while overriding its own soil (or vice versa), each with its own
`provenance` entry, and removes the edit-baking coupling (the two editors write different fields, so
one never touches the other). *Supersedes* the `withoutPosition`/`withoutConditions` "carry the
sibling half through" workaround in the editors, now deleted.

**Migration.** Legacy stored/imported data has the combined object. A pure, idempotent
`splitLegacyConditions` (`src/lib/positionSplit.ts`) moves the position facets into `position` and
copies the old `conditions` provenance onto it; it runs at every entry point — the Dexie **v3**
upgrade (live store), the import parser (`parsePlantDataset`), and backup restore (`parseBackup`) —
so old backups/fragments/records normalise on the way in. The cards, the Compare table, and the
resolver read the two fields independently.

## 2026-07-18 — Three placement shapes: packed area, single round, single rect

A placement's `region` can be occupied three ways, held in one field `Holding.shape: 'area' |
'round' | 'rect'` (absent ⇒ `area`, so pre-existing placements are unaffected):
- **`area`** — a block packed with many plants at their footprint (veg); count derived.
- **`round`** — one plant in a circle of a set radius (pots / planters).
- **`rect`** — one plant filling a rectangle (an espalier along a wall).

*Why one field, not two booleans:* the three are the only meaningful combinations (a packed
circle isn't a thing), so a single 3-value discriminator is tighter than orthogonal `mode` +
`shape` flags and rules out invalid states. *Why reuse `region` rather than store a centre +
radius for round:* keeping one universal spatial field (a rect) means move/clamp/snap/backup all
work unchanged — a `round` is just rendered as the inscribed circle and always counts one. The
pure rule is `placementCount(shape, footprint, region)` in `src/lib/spacing.ts`; the palette's
brush mode picks the shape at placing time (area drags a block, round drops/drags a radius, rect
drags a rectangle) and the inspector can convert an existing placement. No schema version bump —
the field is additive on `Holding` (non-indexed), like the other placement fields.

## 2026-07-18 — The garden planner: a placement is a holding; beds support grid + free spacing

"My garden" grows into a **visual garden planner** (a plot canvas of beds you drop plants onto
at their spacing). Two calls shape the model — full write-up in
[`docs/garden-planner-spec.md`](garden-planner-spec.md).

**A placement _is_ a holding** (unify), not a separate per-year "plan" entity. Dropping a plant
on a bed creates/updates a `Holding` that gains optional spatial fields (`bedId`, `region`,
`footprint`, `year`). *Why:* a parallel Plan store would duplicate the holding and need constant
sync (a placement and "the thing I'm growing" are the same fact); the planning dimension rides on
a holding's `year` + `status` instead. An unplaced holding (no `bedId`) is exactly today's
flat-list entry, so nothing regresses. Cost: "designing next year" and "what's in the ground now"
share a store, disambiguated by `year`/`status` rather than by being separate things.

**Beds carry a spacing model, chosen per bed** — a **square-foot grid** (fixed cells, N plants
per cell by density) _or_ **free spacing** (a dropped block's area ÷ the plant's footprint gives
the count). *Why:* grid suits tidy raised beds, free suits borders/rows/trees; a real garden
mixes both, so it's a per-bed facet, not one global mode. Spacing/rotation/calendar all reuse
data we already hold — rotation from botanical **family**, the calendar from the `PhaseSpan`s —
so the only genuinely new layer is spatial (a `beds` store + placement fields on `Holding`).

New store `beds` + Dexie `version(2)`; backup snapshot → `version: 2` (gains `beds`, tolerant of
v1). Phased build (canvas → calendar/rotation → succession/companion → journal) in the spec.

## 2026-07-18 — Deep-merge nested objects on import; the hand-edit path replaces

Refines *Property-level merge imports*. A nested **object** field (`conditions`, `size`,
`seasonalInterest`, `facts`) now **deep-merges key-by-key** instead of replacing wholesale:
present keys win, absent keys survive, and arrays/scalars are still leaves (replace). *Why:*
these objects are bags of independent facets filled by different sources over time — a seed
packet supplies `conditions.sun`, a botanical DB `conditions.hardiness`; `facts` accretes
`spacing`/`germination`/`harvest` chips one source at a time. Whole-object replace made each
new source silently wipe the others' facets (the concrete bite: a sowing-facts import erased an
existing `harvest`/`heat`). Deep-merge is [RFC 7386](https://datatracker.ietf.org/doc/html/rfc7386)
JSON-Merge-Patch semantics minus the null-delete (we never delete on import: absent ⇒ leave
alone). Arrays stay replace for the same reason as before — a source supplies its *complete* set.

*The exception is the hand-edit path* (`src/app/editNode.ts` → `objects: 'replace'`). The
Position/Conditions editors submit the **whole** object, so removing a facet by omission must
remove it — deep-merge would leave the dropped facet behind. So: **imports accrete, edits are
authoritative.** Both still obey top-level present ⇒ overwrite / absent ⇒ leave-alone.

**Known limit:** provenance stays *field-level*. A deep-merged object is stamped with its
latest contributing source, so per-sub-key provenance isn't tracked (`conditions` filled by two
sources shows only the most recent in its footer). Acceptable for MVP; a fuller model would key
provenance by leaf path. Implemented as `mergeField` in `src/lib/merge.ts`.

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
property — arrays (`soil`, `calendar`) **replace wholesale, they do not union**. *Why
property-level:* it matches how the data actually arrives — botanical facts from one source,
sowing depths from a seed packet — letting lookups be piecemeal without clobbering each other.
*Why replace-not-union for arrays:* a source that supplies `soil` supplies the *complete* set
it knows; unioning would silently accumulate stale values with no way to correct them.
*Supersedes* Forkast's `bulkPut` whole-record upsert. *Refined 2026-07-18* — nested **objects**
deep-merge rather than replacing wholesale (see below).

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

## 2026-07-15 — The backup snapshots every table (reference data is precious once user-touched)

Save/Open exports a self-contained `BackupSnapshot` of **all six tables** (nodes, guides, tasks,
holdings, jobLog, settings) and restores by wiping then reloading wholesale — a true restore point
with no tombstones (the saved set *is* the record of what was kept). *Why include the reference
nodes* — Forkast's backup excludes disposable seed data, but Tilth's nodes can be hand-authored
(`"manual"`) or merge-imported, so excluding them would lose exactly the plants the gardener built
up. Restore validates lightly and **preserves whole records including `provenance`** — it must NOT
run nodes through `parsePlantDataset` (that guards *import fragments*: it preserves partiality and
strips provenance, which the merge owns). Persistence stays IndexedDB + JSON export (no File System
Access API); Save downloads via an anchor + object URL, Open reads a picked file. A restored
snapshot lacking a `dataSource` marker is stamped user-owned so the demo re-seed can't clobber it.
