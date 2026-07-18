import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlantNode } from '../schema/plant'
import { updateNode, clearNodeField } from '../app/editNode'
import { deepEqual } from '../lib/equal'
import { fromFactsDraft, toFactsDraft, type FactRow } from '../lib/factsEdit'
import { EditorFooter } from './EditorControls'

// A modal for editing the "More facts" card — the free key/value chips (e.g. "spacing" → "20cm").
// Rows can be added, edited and removed; the preview shows the exact chips the cheatsheet renders.
// Saving writes the node's own `facts` via the merge seam (stamped `manual`, whole-object replace,
// so a removed row removes its key); Clear removes the field so the card inherits again.

export function FactsEditor({
  node,
  facts,
  onClose,
}: {
  node: PlantNode
  /** The resolved (possibly inherited) facts currently shown — the editor's starting point. */
  facts: Record<string, string> | undefined
  onClose: () => void
}) {
  const initial = useMemo(() => toFactsDraft(facts), [facts])
  const [rows, setRows] = useState<FactRow[]>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const preview = useMemo(() => fromFactsDraft(rows), [rows])
  const previewEntries = Object.entries(preview)
  const dirty = !deepEqual(rows, initial)
  const canClear = node.facts !== undefined

  function setRow(i: number, patch: Partial<FactRow>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  async function onSave() {
    if (!dirty) return onClose()
    setSaving(true)
    setError(null)
    try {
      await updateNode(node, { facts: preview })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
      setSaving(false)
    }
  }

  async function onClear() {
    setSaving(true)
    setError(null)
    try {
      await clearNodeField(node.id, 'facts')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not clear.')
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit more facts"
        onClick={(e) => e.stopPropagation()}
        className="relative my-4 w-full max-w-xl rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-h3 font-semibold">More facts</h2>
            <p className="text-xs text-subtle">Free labelled facts shown as chips (e.g. spacing → 20cm).</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-sunken hover:text-ink"
          >
            ✕
          </button>
        </div>

        {/* Live preview — the exact chips the cheatsheet will show. */}
        <div className="mb-5">
          <div className="mb-1.5 text-[0.6rem] font-medium uppercase tracking-wide text-subtle">Preview</div>
          <div className="overflow-hidden rounded-lg border border-line bg-card p-4">
            {previewEntries.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {previewEntries.map(([key, value]) => (
                  <span key={key} className="inline-flex items-baseline gap-1.5 rounded-md bg-sunken px-2.5 py-1 text-sm">
                    <span className="text-xs uppercase tracking-wide text-subtle">{key}</span>
                    <span className="font-medium">{value}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">None recorded yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={row.key}
                placeholder="label"
                aria-label={`Fact ${i + 1} label`}
                onChange={(e) => setRow(i, { key: e.target.value })}
                className="w-2/5 flex-none rounded-md border border-line bg-card px-2.5 py-1.5 text-sm placeholder:text-subtle"
              />
              <input
                type="text"
                value={row.value}
                placeholder="value"
                aria-label={`Fact ${i + 1} value`}
                onChange={(e) => setRow(i, { value: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-line bg-card px-2.5 py-1.5 text-sm placeholder:text-subtle"
              />
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                aria-label={`Remove fact ${i + 1}`}
                className="flex-none rounded-md px-2 py-1 text-muted hover:bg-sunken hover:text-ink"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, { key: '', value: '' }])}
            className="self-start rounded-md border border-dashed border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            + Add fact
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-accent-ink">{error}</p>}

        <EditorFooter onClear={onClear} canClear={canClear} onCancel={onClose} onSave={onSave} saving={saving} saveDisabled={!dirty} />
      </div>
    </div>,
    document.body,
  )
}
