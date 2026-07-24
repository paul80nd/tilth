import { describe, it, expect } from 'vitest'
import { backupStatus, daysSince, STALE_DAYS } from './backupNudge'

const NOW = new Date('2026-07-24T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

describe('daysSince', () => {
  it('counts whole days, clamping earlier-today to 0', () => {
    expect(daysSince(daysAgo(0), NOW)).toBe(0)
    expect(daysSince(new Date(NOW.getTime() - 5 * 3_600_000).toISOString(), NOW)).toBe(0) // 5h
    expect(daysSince(daysAgo(1), NOW)).toBe(1)
    expect(daysSince(daysAgo(9), NOW)).toBe(9)
  })

  it('never goes negative for a future timestamp', () => {
    expect(daysSince(daysAgo(-3), NOW)).toBe(0)
  })

  it('is 0 for an unparseable timestamp', () => {
    expect(daysSince('not-a-date', NOW)).toBe(0)
  })
})

describe('backupStatus', () => {
  it('warns when there is no backup yet', () => {
    const s = backupStatus(null, NOW)
    expect(s.tone).toBe('warn')
    expect(s.short).toBe('No backup yet')
  })

  it('reads ok today, yesterday, and within the stale window', () => {
    expect(backupStatus(daysAgo(0), NOW)).toMatchObject({ tone: 'ok', short: 'Backup today' })
    expect(backupStatus(daysAgo(1), NOW)).toMatchObject({ tone: 'ok', short: 'Backup yesterday' })
    expect(backupStatus(daysAgo(3), NOW)).toMatchObject({ tone: 'ok', short: 'Backup 3 days ago' })
  })

  it('warns once the backup reaches the stale threshold', () => {
    expect(backupStatus(daysAgo(STALE_DAYS - 1), NOW).tone).toBe('ok')
    const stale = backupStatus(daysAgo(STALE_DAYS), NOW)
    expect(stale.tone).toBe('warn')
    expect(stale.short).toBe(`Backup ${STALE_DAYS} days ago`)
  })
})
