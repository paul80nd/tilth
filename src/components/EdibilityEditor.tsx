import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlantNode } from '../schema/plant'
import { updateNode, clearNodeFields } from '../app/editNode'
import { deepEqual } from '../lib/equal'
import { fromEdibilityDraft, toEdibilityDraft, type EdibilityDraft } from '../lib/edibilityEdit'
import { EdibilityFacts } from './KeyFacts'
import { EditorFooter } from './EditorControls'

// A modal for editing the Edibility card — the node's edible parts (a free comma-separated list)
// and an optional toxicity/caution note. Both are free text kept verbatim. Saving writes the
// node's own `edible`/`toxicity` via the merge seam (stamped `manual`); Clear removes both so the
// card inherits from a parent again. An unchanged edit writes nothing.

export function EdibilityEditor({
  node,
  edible,
  toxicity,
  onClose,
}: {
  node: PlantNode
  /** The resolved (possibly inherited) values currently shown — the editor's starting point. */
  edible: string[] | undefined
  toxicity: string | undefined
  onClose: () => void
}) {
  const initial = useMemo(() => toEdibilityDraft(edible, toxicity), [edible, toxicity])
  const [draft, setDraft] = useState<EdibilityDraft>(initial)
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

  const preview = useMemo(() => fromEdibilityDraft(draft), [draft])
  const dirty = !deepEqual(draft, initial)
  const canClear = node.edible !== undefined || node.toxicity !== undefined

  async function onSave() {
    if (!dirty) return onClose()
    setSaving(true)
    setError(null)
    try {
      await updateNode(node, { edible: preview.edible, toxicity: preview.toxicity })
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
      await clearNodeFields(node.id, ['edible', 'toxicity'])
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
        aria-label="Edit edibility"
        onClick={(e) => e.stopPropagation()}
        className="relative my-4 w-full max-w-xl rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-h3 font-semibold">Edibility</h2>
            <p className="text-xs text-subtle">Which parts you can eat, and any caution. Free text.</p>
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

        {/* Live preview — the exact card the cheatsheet will show. */}
        <div className="mb-5">
          <div className="mb-1.5 text-[0.6rem] font-medium uppercase tracking-wide text-subtle">Preview</div>
          <div className="overflow-hidden rounded-lg border border-line bg-card p-4">
            <EdibilityFacts edible={preview.edible} toxicity={preview.toxicity || undefined} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted">Edible parts</span>
            <input
              type="text"
              value={draft.edible}
              placeholder="e.g. fruit, leaves"
              onChange={(e) => setDraft((d) => ({ ...d, edible: e.target.value }))}
              className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-sm placeholder:text-subtle"
            />
            <span className="text-xs text-subtle">Comma-separated.</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted">Caution</span>
            <textarea
              value={draft.toxicity}
              placeholder="e.g. Harmful if eaten; skin/eye irritant"
              rows={2}
              onChange={(e) => setDraft((d) => ({ ...d, toxicity: e.target.value }))}
              className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-sm placeholder:text-subtle"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-accent-ink">{error}</p>}

        <EditorFooter onClear={onClear} canClear={canClear} onCancel={onClose} onSave={onSave} saving={saving} saveDisabled={!dirty} />
      </div>
    </div>,
    document.body,
  )
}
