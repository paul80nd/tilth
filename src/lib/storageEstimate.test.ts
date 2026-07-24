import { describe, it, expect } from 'vitest'
import { formatBytes, storageDisplay, type StorageInfo } from './storageEstimate'

describe('formatBytes', () => {
  it('shows bytes below 1 kB and clamps negatives to 0', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(-5)).toBe('0 B')
  })

  it('scales through decimal units, one decimal below 10', () => {
    expect(formatBytes(1500)).toBe('1.5 kB')
    expect(formatBytes(1_200_000)).toBe('1.2 MB')
    expect(formatBytes(12_000_000)).toBe('12 MB')
    expect(formatBytes(2_500_000_000)).toBe('2.5 GB')
  })
})

const info = (o: Partial<StorageInfo> = {}): StorageInfo => ({
  supported: true,
  persisted: false,
  usage: 5_000_000,
  quota: 100_000_000,
  ...o,
})

describe('storageDisplay', () => {
  it('computes percent, labels and bar width from usage/quota', () => {
    const d = storageDisplay(info())
    expect(d.usageLabel).toBe('5.0 MB')
    expect(d.quotaLabel).toBe('100 MB')
    expect(d.percent).toBe(5)
    expect(d.percentLabel).toBe('5%')
    expect(d.barPct).toBe(5)
  })

  it('renders <1% for a tiny non-zero fraction', () => {
    expect(storageDisplay(info({ usage: 100_000, quota: 100_000_000 })).percentLabel).toBe('<1%')
  })

  it('degrades to dashes when figures are missing', () => {
    const d = storageDisplay(info({ usage: null, quota: null }))
    expect(d.usageLabel).toBe('—')
    expect(d.quotaLabel).toBe('—')
    expect(d.percent).toBeNull()
    expect(d.barPct).toBe(0)
  })

  it('flags the persist tone from whether persistence is granted', () => {
    expect(storageDisplay(info({ persisted: true })).persist.tone).toBe('ok')
    expect(storageDisplay(info({ persisted: false })).persist.tone).toBe('warn')
  })
})
