# CLAUDE.md

Guidance for agents/humans on Tilth — conventions and non-obvious gotchas only. If
something here surprises you or proves wrong, tell the developer and update this file.

> **Read `HANDOVER.local.md` first** (repo root, gitignored): current build status, next
> steps, and private context (the real sources) deliberately kept out of the committed repo.

> **Sibling project:** Tilth is built on the same chassis as **Forkast** at `../forkast`
> (a local-first meal planner by the same developer). You are welcome to read back into
> `../forkast` for reference — its conventions, spec/ADR style, test harness, design-system
> wiring, and app-layer patterns are the template Tilth follows. **Read it, don't modify
> it** — it's a separate repo.

## What this is

A local-first **garden almanac + planner**. You keep a personal collection of plant
**cheatsheets** — one scannable, image-dense page per plant, merged from several sources
(a horticultural database, seed-packet pages) — record what you actually grow, and get a
**month-by-month job list** aggregated from the things in your garden. Browser-only
(IndexedDB); no server.

Two things make it unlike Forkast:
- **Merge imports.** Reference data is filled from several sources over time. An import
  fragment carries only *some* fields; **present ⇒ overwrite, absent ⇒ leave alone**, with
  per-field **provenance** recorded. (Forkast replaces whole records.)
- **Inventory-first.** You enter the plants you have, then look those specific ones up —
  targeted enrichment, not a bulk catalogue crawl.

## Documentation (living docs — keep honest)

Prose specs are the source of truth for *design + rationale*; the Gherkin `features/` are
the executable proof. If code and a doc disagree, fix the doc in the same change.

- [`docs/spec.md`](docs/spec.md) — whole-app design, data model, persistence, MVP scope.
- [`docs/decisions.md`](docs/decisions.md) — the cross-cutting decision trail (ADRs). Add
  an entry when you make an architectural call.
- Per-feature specs live in `docs/` as features land (mirroring Forkast's `docs/*-spec.md`).
- `features/*.feature` (+ `features/steps/`) — behaviour, run as tests.
- `scripts/ACQUIRE.md` — generic agent playbook for looking up a plant from a source.

## Privacy firewall — non-negotiable

Generic-input by design: source knowledge is *config + data*, never code. Enforced by
`.gitignore`.

- **Never commit** anything under `data/private/` or `adapters-private/`, any
  `*.private.json`, or any source name / URL / scraped plant text in a committed file —
  `grep -ri <source>` over the repo (commit messages included) must return nothing.
- Committed data is **fictional demo only** (`public/demo/`). Botanical taxonomy (families,
  genera) and the phase/condition vocabularies are generic knowledge and *are* public.
- `*.local.md` is gitignored (private notes/handover).

## Stack & commands

React 19 · Vite · TypeScript · Tailwind v4 · Dexie (IndexedDB) · HashRouter · Vitest 4.

```bash
npm run dev            # http://localhost:5173
npm run build          # tsc -b && vite build
npm test               # unit + feature tests
npm run test:features  # feature (Gherkin) tests only
```

- **HashRouter** (not BrowserRouter) — static hosting (GitHub Pages / local), no rewrites.
- **Supports all evergreen browsers; Safari is the primary/reference target** — no File
  System Access API; persistence is IndexedDB (working store) + JSON **export** (the durable
  backup — browsers may evict idle IDB, Safari most eagerly). Keep user-facing copy
  browser-neutral (don't name Safari).
- CLI/scripts run on **native Node ≥22** (strips TS types — no build step, no `tsx`).
- **Design:** a Tilth design system is TBD (Forkast has the `forkast-design` skill as a
  model — same token/bridge approach, different brand). Until then, keep UI minimal and
  semantic; don't hard-code a palette that a later theme will have to unpick.

## Architecture

Two committed parts: the **SPA** and the generic **schema** (`src/schema/`, source-neutral).
A private, on-demand import pipeline looks up specific plants and emits **fragments** in
that schema. The SPA only ever sees our schema, never raw source payloads.

- **App layer (`src/app/`)** — use-cases orchestrating Dexie + pure libs (e.g. the merge
  import). This is the seam the UI **and** the feature tests both call: pages stay thin
  shells, so behaviour is tested below React. Pure shaping/validation stays in `src/lib/`.
- **Reference data** (plant nodes / guides / tasks) seeds into IndexedDB from
  `public/demo/` on first run — but **never when `dataSource === 'user'`** (a real import
  sets this, so user data is never clobbered).
- **User data** (holdings, job history, notes, settings) lives in IndexedDB; its durable
  backup is an exported JSON.

### Data model (the non-obvious bits)

- **Hierarchy.** A `PlantNode` sits at any botanical `rank` and links up via `parentId`.
  Guidance and jobs attach at a rank and **aggregate down** to the specific things you grow.
- **Merge + provenance.** Import is a **property-level overlay**: provided fields overwrite,
  absent fields are left alone, and each top-level field records which `source` set it.
  Arrays are whole fields (replace, not union); nested objects (`conditions`, `facts`, …)
  deep-merge per key on import, so sources accrete — the hand-edit path replaces instead. See `src/schema/plant.ts` +
  docs/decisions.md.
- **Calendar.** Per-month `PhaseSpan`s stored as source-neutral **shortcodes**; the UI maps
  a code → colour + legend (seed brands colour differently, so colour is never stored).
  Actionable codes feed the **jobs engine**; state codes (flower/foliage/fruit) are display.
- **Cheatsheet, not prose.** The held artefact is a dense, scannable one-pager. Long prose
  guides are **linked**, not copied (they drift; we don't want to re-host them).

## Testing

Two tiers, one runner (Vitest 4):

- **Unit** — `src/**/*.test.ts` beside the code, for tight pure logic (the merge overlay,
  taxonomy roll-up, calendar → jobs). Import from `vitest` explicitly (no globals).
- **Feature (Gherkin)** — living documentation. `.feature` files in `features/`, steps in
  `features/steps/*.steps.ts` via `@amiceli/vitest-cucumber`. Steps drive the **app layer**
  against **`fake-indexeddb`** — real Dexie code paths, no browser, no React. `test/setup.ts`
  installs `fake-indexeddb/auto`; each scenario's `Background` resets the store.

## House rules

- **Green before every commit:** `npm run build` *and* `npm test` both pass. No exceptions.
- **Every new feature ships with a Gherkin scenario** covering it — regression net + docs.
  Tight pure logic also gets unit tests.
- **New IndexedDB logic goes in `src/app/`**, not inline in components.
- Keep `src/lib/` pure (no Dexie, no I/O) and unit-tested.
- **Commit freely; never `git push`** — pushing is the developer's. Surface commit SHAs.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Comments** explain what the code does now (+ why if non-obvious); never narrate history.
- Honour the **privacy firewall** on every change.
- **Third-party SVGs/icons:** whenever the developer hands over an icon/SVG to use, check its
  **source + licence** first, prefer permissive (MIT/Apache/CC0 — avoid copyleft like CC BY-SA
  in this MIT repo), and record attribution in [`CREDITS.md`](CREDITS.md) (set, author, licence,
  note any recolour/resize). Flag anything copyleft before adopting it.
