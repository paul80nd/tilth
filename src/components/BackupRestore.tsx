import { useRef, useState } from 'react'
import { exportBackup, importBackup, type RestoreResult } from '../app/backup'

// Save / Open: a self-contained snapshot of every table to a JSON file, and a wipe-and-restore
// back from one. We don't use the File System Access API (not in every evergreen browser), so
// Save downloads via an anchor + object URL and Open reads a picked file. The heavy lifting
// lives in the app layer; this is the thin shell.
export default function BackupRestore() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'save' | 'open' | null>(null)
  const [restored, setRestored] = useState<RestoreResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSave() {
    setBusy('save')
    setError(null)
    setRestored(null)
    try {
      const snapshot = await exportBackup()
      const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tilth-backup-${snapshot.exportedAt.slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(`Save failed: ${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so re-picking the same file fires change again
    if (!file) return
    // Open is a full replace — confirm before wiping the current state.
    if (
      !window.confirm(
        'Restore from this backup?\n\n' +
          'This REPLACES everything currently in Tilth — your plants, source links, garden ' +
          'and settings — with the contents of the file. Continue?',
      )
    ) {
      return
    }
    setBusy('open')
    setError(null)
    setRestored(null)
    try {
      const text = await file.text()
      setRestored(await importBackup(text))
    } catch (err) {
      setError(`Restore failed: ${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <h2 className="font-display text-h3 font-semibold">Backup</h2>
      <p className="mt-1 text-sm text-muted">
        <span className="font-medium text-ink">Save</span> downloads a complete snapshot of
        everything in Tilth — your plants, source links, garden and settings — as a JSON file.
        It's the durable backup: keep it somewhere safe, because a browser can clear the app's
        local storage.{' '}
        <span className="font-medium text-ink">Open</span> restores from one, replacing
        everything currently in Tilth.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        onChange={onFile}
        className="hidden"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={onSave}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-onbrand hover:opacity-90 disabled:opacity-50"
        >
          {busy === 'save' ? 'Saving…' : 'Save backup…'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-sunken hover:text-ink disabled:opacity-50"
        >
          {busy === 'open' ? 'Restoring…' : 'Open backup…'}
        </button>
      </div>

      {restored && (
        <div className="mt-3 rounded-md border border-line bg-brand-tint p-3 text-sm text-brand-ink">
          Restored <span className="font-semibold">{restored.nodes}</span>{' '}
          {restored.nodes === 1 ? 'plant' : 'plants'} and{' '}
          <span className="font-semibold">{restored.holdings}</span>{' '}
          {restored.holdings === 1 ? 'holding' : 'holdings'}.
          {restored.warnings.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {restored.warnings.slice(0, 10).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
              {restored.warnings.length > 10 && <li>…and {restored.warnings.length - 10} more.</li>}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md border border-accent bg-accent-tint p-3 text-sm text-accent-ink">
          {error}
        </div>
      )}
    </section>
  )
}
