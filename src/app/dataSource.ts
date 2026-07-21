// Application layer: the single owner of the `dataSource` marker. The working store holds either
// the first-run *demo* collection or the user's *own* data; this marker is what stops a demo
// re-seed (seedDemoIfEmpty) from clobbering a real garden. Every mutating seam marks it
// user-owned; only the seed marks it demo. Centralised here so the key + values live in one place
// and no seam can silently forget the guard.

import { db } from '../db/db'

/** Settings key holding the store's ownership — `'user'` or `'demo'`. */
export const DATA_SOURCE_KEY = 'dataSource'

/** Mark the working store as the user's own so the demo re-seed leaves it alone. Safe to call
 *  inside an existing `rw` transaction that includes `db.settings` (it just puts one record). */
export async function markUser(): Promise<void> {
  await db.settings.put({ key: DATA_SOURCE_KEY, value: 'user' })
}

/** Mark the working store as the bundled demo set (first run / demo-version refresh). */
export async function markDemo(): Promise<void> {
  await db.settings.put({ key: DATA_SOURCE_KEY, value: 'demo' })
}
