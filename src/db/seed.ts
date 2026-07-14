import { db } from './db'
import { resolveAsset } from '../lib/assets'
import { importFragment } from '../app/dataset'

// Bump when the bundled demo dataset changes so demo users auto-refresh.
const DEMO_VERSION = 2

async function importDemo(): Promise<void> {
  const res = await fetch(resolveAsset('demo/plants.json'))
  if (!res.ok) throw new Error(`Failed to load demo dataset: ${res.status}`)
  const dataset = await res.json()

  await db.transaction('rw', db.nodes, db.guides, db.tasks, db.settings, async () => {
    // Fresh demo: clear the reference stores so a version bump replaces cleanly (the merge
    // overlay is exercised by imports, not the seed). User data is never touched.
    await db.nodes.clear()
    await db.guides.clear()
    await db.tasks.clear()
    // Stamp provenance with the fragment's own `source` keys; mark the store demo-owned.
    await importFragment(dataset, {}, false)
    await db.settings.put({ key: 'dataSource', value: 'demo' })
    await db.settings.put({ key: 'demoVersion', value: DEMO_VERSION })
  })
}

/**
 * First run loads the bundled fictional demo set. It also refreshes when the bundled
 * version changes — but a user's own imported data (`dataSource === 'user'`) is never
 * touched. Mirrors Forkast's seed guard.
 */
export async function seedDemoIfEmpty(): Promise<void> {
  if ((await db.nodes.count()) === 0) {
    await importDemo()
    return
  }
  const source = (await db.settings.get('dataSource'))?.value
  if (source === 'user') return
  const version = (await db.settings.get('demoVersion'))?.value
  if (version !== DEMO_VERSION) await importDemo()
}
