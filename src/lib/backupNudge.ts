// Shared backup-staleness logic, used by both the Data page's Backup card and the header
// nudge. Pure (given "now"), so it unit-tests without a clock.

// How old (days) a backup can get before we nudge. A week: long enough not to nag after a
// quiet spell, short enough to bound how much a browser eviction could cost you.
export const STALE_DAYS = 7

const DAY_MS = 86_400_000

/** Whole days between an ISO timestamp and `now` (0 for anything earlier today). */
export function daysSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 0
  return Math.max(0, Math.floor((now.getTime() - then) / DAY_MS))
}

export interface BackupStatus {
  /** 'warn' when there's no backup yet or it's stale — drives the amber styling and the
   *  header indicator's visibility. 'ok' otherwise. */
  tone: 'warn' | 'ok'
  /** Full sentence for the Data card and the header tooltip. */
  text: string
  /** Terse label for the header indicator ("No backup yet" / "Backup 3 days ago"). */
  short: string
}

export function backupStatus(lastAt: string | null, now: Date = new Date()): BackupStatus {
  if (!lastAt) {
    return {
      tone: 'warn',
      short: 'No backup yet',
      text: "You haven't saved a backup on this device yet. Your browser can clear the app's data — save one to be safe.",
    }
  }
  const days = daysSince(lastAt, now)
  const ago = days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
  if (days >= STALE_DAYS) {
    return {
      tone: 'warn',
      short: `Backup ${ago}`,
      text: `Last backup was ${ago}. Save a fresh one to protect recent changes.`,
    }
  }
  return { tone: 'ok', short: `Backup ${ago}`, text: `Last backup: ${ago}.` }
}
