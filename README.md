# Tilth

*A local-first almanac for everything you grow.*

Tilth keeps a personal collection of plant **cheatsheets** — one scannable, image-dense page
per plant, merged from several sources — lets you record what you actually grow, and gives you
the **month-by-month jobs** for the garden you have. Browser-only, no server, nothing leaves
your machine.

> **Status:** early scaffolding. The design lives in [`docs/spec.md`](docs/spec.md) (a draft)
> and the decision trail in [`docs/decisions.md`](docs/decisions.md). Built on the same chassis
> as its sibling project [Forkast](https://github.com/paul80nd/forkast).

## What makes it tick

- **Merge imports.** Reference data is filled from several sources over time. An import fragment
  carries only *some* fields — present fields overwrite, absent fields are left alone — and every
  field remembers which source set it.
- **Inventory-first.** You enter the plants you have, then look those specific ones up.
- **Hierarchy.** Plants form a taxonomy (family → genus → species → cultivar); guidance and jobs
  attach at a level and aggregate down to the things you grow.
- **Cheatsheet, not encyclopaedia.** Dense structured data held locally; long prose guidance
  linked, not re-hosted.

## Privacy firewall

Generic-input by design. Source knowledge is data + config + a private adapter, never committed
code. Real data and adapters are gitignored (`data/private/`, `adapters-private/`,
`*.private.json`); the committed repo carries only the generic schema, the app, generic
importers, and **fictional** demo data.

## Stack & commands

React 19 · Vite · TypeScript · Tailwind v4 · Dexie (IndexedDB) · HashRouter · Vitest 4.

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # tsc -b && vite build
npm test               # unit + feature tests
```

MIT.
