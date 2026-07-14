# Looking up a plant — agent playbook

A runbook for an agent (e.g. Claude Code) to enrich Tilth's reference data by looking up
**specific plants** the gardener holds or wants, from a source of their choosing, emitting
schema **fragments** to merge in.

It is deliberately **generic** — it names no source. The source-specific bits (URLs, field
paths, the fetched data) land in `data/private/` and a `*.private.json` config, which are
gitignored. Keep it that way (firewall + politeness at the foot of this file).

This is **inventory-first**, the inverse of a catalogue crawl: you already know *which* plants
matter (they're in the garden). You look each one up, map its page onto our schema, and produce a
**partial** fragment — only the fields that source supplies. Run again from another source to fill
more fields; the app's **property-level merge** overlays them (present ⇒ overwrite, absent ⇒ keep)
and stamps provenance.

The end state you're driving toward:

```
data/private/
  <source>.private.json      # per-source config (base URL + field paths + source key)
  lookup-list.txt            # the plants to look up (one per line: botanical or common name)
  MAPPING-NOTES.md           # source → Tilth schema field map (per source)
  raw/<slug>.json            # verbatim cached source payloads
  images/<slug>.<ext>        # one hero image per plant
  fragments/<source>.json    # emitted PlantDataset fragment(s) to import in-app
```

---

## 0. Ask the gardener first

- **Which source(s)?** There are usually two kinds: a **horticultural database** (botanical
  facts, conditions, size, hardiness, habit) and **seed-packet pages** (sow depths/timings,
  germination, spacing, the flowering chart). They're **complementary** — that's the merge case.
- **Which plants?** Start from the holdings/wishlist (see `lookup-list.txt`), not a sitemap.
- **Permission & politeness.** Personal, non-commercial use; rate-limit; respect `robots.txt`;
  never commit the fetched data.
- **Source key.** Agree an opaque key per source (`"plant-db"`, `"seed-packet"`) — this is what
  provenance stores in *public* data. The key → real-source mapping stays private.

## 1. Learn the shape (one sample per source)

- Fetch **one** plant. Prefer a JSON API / endpoint; otherwise read the page's `schema.org`
  markup or scrape the details table. Save it under `data/private/raw/`.
- Map its fields onto Tilth's schema (`src/schema/plant.ts`). Write the mapping + gotchas to
  `data/private/MAPPING-NOTES.md`. Watch for:
  - the **rank** — is this page a cultivar, a species, or a general crop page? It sets
    `PlantNode.rank` and where it hangs in the taxonomy (`parentId`).
  - the **calendar** — translate the source's month bar into `PhaseSpan` **shortcodes**
    (`sow-outdoors`, `flower`, `harvest`, …). Record which source colour meant which code;
    **don't store colours**.
  - **conditions** — soil / moisture / pH / sun / exposure / hardiness → the closed
    vocabularies in `Conditions`.
  - **free facts** — spacing, germination time/temp, sowing depth → the `facts` key/value map.
  - where the **hero image** lives and what widths exist (pick one near a target width).

## 2. Build the lookup list

- Draw from the gardener's holdings + wishlist. One plant per line (botanical name preferred;
  common name fine). `#` comments allowed. Keep it — re-running only fetches what's new.

## 3. Configure the source

- Copy `scripts/source.config.example.json` → `data/private/<source>.private.json`. Fill in the
  base URL / field paths / image path and the **`sourceKey`**.

## 4. Look up & emit fragments

- **Test small first** (2–3 plants) — shape bugs are cheap to catch early.
- For each plant: fetch (cache raw + one image), map onto a **partial** `PlantNode` (+ any
  `guides`/`tasks`), set every emitted field's provenance to this source, and write a
  `PlantDataset` fragment to `data/private/fragments/<source>.json`.
- The gardener imports the fragment in-app; the merge overlays it onto existing nodes.

## Always

- **Privacy firewall.** Source URLs, field paths, and any fetched data stay in `data/private/` +
  `*.private.json` (gitignored). Committed code/config names no source. The committed taxonomy +
  vocabularies are generic knowledge and stay public. Provenance in public data is an **opaque
  key**, never a brand/URL.
- **Politeness.** Personal, non-commercial use only. Rate-limit, respect `robots.txt`, fetch each
  page once (cache + skip), and never commit the fetched data. **Prefer linking** long prose
  guidance over copying it (see docs/decisions.md).
