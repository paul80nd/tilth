import { useState } from 'react'
import { useStorageEstimate } from '../hooks/useStorageEstimate'

// Data page card: how much space Tilth is using in this browser, and whether the browser has
// granted persistent storage (which stops it evicting the data under space pressure). All of
// it degrades quietly where the browser doesn't report figures — informational, never a gate.
export default function StorageUsage() {
  const { display, loading, canRequestPersist, requestPersist } = useStorageEstimate()
  const [busy, setBusy] = useState(false)

  async function onRequest() {
    setBusy(true)
    try {
      await requestPersist()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <h2 className="font-display text-h3 font-semibold">Storage</h2>

      {loading ? (
        <p className="mt-1 text-sm text-muted">Checking…</p>
      ) : !display?.supported ? (
        <p className="mt-1 text-sm text-muted">
          This browser doesn't report storage usage. Your saved JSON backup is the durable copy
          either way.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Tilth is using <span className="font-medium text-ink">{display.usageLabel}</span>
            {display.percent != null && (
              <> of about {display.quotaLabel} available ({display.percentLabel})</>
            )}
            .
          </p>

          {display.percent != null && (
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-sunken"
              role="progressbar"
              aria-valuenow={Math.round(display.percent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Storage used"
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${display.barPct}%` }} />
            </div>
          )}

          <div
            className={`mt-3 rounded-md p-3 text-sm ${
              display.persist.tone === 'ok'
                ? 'bg-brand-tint text-brand-ink'
                : 'bg-warn-soft text-warn-ink'
            }`}
          >
            {display.persist.text}
          </div>

          {canRequestPersist && (
            <button
              type="button"
              disabled={busy}
              onClick={onRequest}
              className="mt-3 rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-sunken hover:text-ink disabled:opacity-50"
            >
              {busy ? 'Requesting…' : 'Request persistent storage'}
            </button>
          )}
        </>
      )}
    </section>
  )
}
