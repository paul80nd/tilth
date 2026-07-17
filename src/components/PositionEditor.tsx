import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Conditions, PlantNode } from '../schema/plant'
import { updateNode } from '../app/editNode'
import { deepEqual } from '../lib/equal'
import {
  CARDINALS,
  EXPOSURE_LEVELS,
  HARDINESS_MAX,
  LIGHT_LEVELS,
  conditionLabel,
} from '../lib/conditions'
import { applyPosition, toPositionDraft, type PositionDraft } from '../lib/positionEdit'
import PositionCard from './PositionCard'

// A modal for editing the Position facets (light · aspect · exposure · hardiness) with a live
// preview of the exact card the cheatsheet shows. These share the `conditions` field with the
// Conditions card (soil/moisture/ph), which the merge replaces wholesale — so we start from the
// resolved conditions and carry the sibling soil/moisture/ph through untouched (see positionEdit).
// Saving writes the node's own conditions via the normal merge seam (stamped `manual`); an
// unchanged edit writes nothing.

const HARDINESS = Array.from({ length: HARDINESS_MAX }, (_, i) => `H${i + 1}`)

export function PositionEditor({
  node,
  conditions,
  onClose,
}: {
  node: PlantNode
  /** The resolved (possibly inherited) conditions currently shown — the editor's starting point. */
  conditions: Conditions | undefined
  onClose: () => void
}) {
  const initial = useMemo(() => toPositionDraft(conditions), [conditions])
  const [draft, setDraft] = useState<PositionDraft>(initial)
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

  // Fold the draft back onto the conditions so the preview is exactly what the card will render.
  const preview = useMemo(() => applyPosition(conditions, draft), [conditions, draft])
  const dirty = !deepEqual(draft, initial)

  function toggle<T>(key: 'sun' | 'aspect' | 'exposure', value: T, order: readonly T[]) {
    setDraft((d) => {
      const cur = d[key] as unknown as T[]
      const has = cur.includes(value)
      const next = has ? cur.filter((v) => v !== value) : order.filter((v) => v === value || cur.includes(v))
      return { ...d, [key]: next }
    })
  }

  async function onSave() {
    if (!dirty) return onClose()
    setSaving(true)
    setError(null)
    try {
      await updateNode(node, { conditions: preview })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit position"
        onClick={(e) => e.stopPropagation()}
        className="relative my-4 w-full max-w-2xl rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-h3 font-semibold">Position</h2>
            <p className="text-xs text-subtle">Where this plant wants to grow — light, the aspect it faces, shelter, and hardiness.</p>
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
          <div className="h-32 overflow-hidden rounded-lg border border-line bg-card">
            <PositionCard conditions={preview} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Row label="Light">
            {LIGHT_LEVELS.map((l) => (
              <Toggle key={l} on={draft.sun.includes(l)} onClick={() => toggle('sun', l, LIGHT_LEVELS)}>
                {conditionLabel(l)}
              </Toggle>
            ))}
          </Row>

          <Row label="Aspect" hint="the direction the spot faces">
            {CARDINALS.map((c) => (
              <Toggle key={c} on={draft.aspect.includes(c)} onClick={() => toggle('aspect', c, CARDINALS)}>
                {conditionLabel(c)}
              </Toggle>
            ))}
          </Row>

          <Row label="Exposure" hint="tick both for “any”">
            {EXPOSURE_LEVELS.map((e) => (
              <Toggle key={e} on={draft.exposure.includes(e)} onClick={() => toggle('exposure', e, EXPOSURE_LEVELS)}>
                {conditionLabel(e)}
              </Toggle>
            ))}
          </Row>

          <Row label="Hardiness" hint="H1 tender → H7 very hardy">
            {HARDINESS.map((h) => (
              <Toggle
                key={h}
                on={draft.hardiness === h}
                // Single-select: re-tick to clear.
                onClick={() => setDraft((d) => ({ ...d, hardiness: d.hardiness === h ? '' : h }))}
              >
                {h}
              </Toggle>
            ))}
          </Row>
        </div>

        {error && <p className="mt-3 text-sm text-accent-ink">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-onbrand hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-muted">{label}</span>
        {hint && <span className="text-xs text-subtle">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-sm font-medium transition-colors ${
        on ? 'border-brand bg-brand-tint text-brand-ink' : 'border-line text-muted hover:bg-sunken hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
