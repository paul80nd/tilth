import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Conditions, PlantNode } from '../schema/plant'
import { updateNode } from '../app/editNode'
import { deepEqual } from '../lib/equal'
import {
  MOISTURE_LEVELS,
  PH_LEVELS,
  SOIL_TYPES,
  conditionLabel,
} from '../lib/conditions'
import { applyConditions, toConditionsDraft, type ConditionsDraft } from '../lib/conditionsEdit'
import ConditionsCard from './ConditionsCard'
import { Row, Toggle } from './EditorControls'

// A modal for editing the growing-condition facets (soil · moisture · pH) with a live preview of
// the exact card the cheatsheet shows. These share the `conditions` field with the Position card
// (light/aspect/exposure/hardiness), which the merge replaces wholesale — so we start from the
// resolved conditions and carry the sibling position facets through untouched (see conditionsEdit).
// Saving writes the node's own conditions via the normal merge seam (stamped `manual`); an
// unchanged edit writes nothing.

export function ConditionsEditor({
  node,
  conditions,
  onClose,
}: {
  node: PlantNode
  /** The resolved (possibly inherited) conditions currently shown — the editor's starting point. */
  conditions: Conditions | undefined
  onClose: () => void
}) {
  const initial = useMemo(() => toConditionsDraft(conditions), [conditions])
  const [draft, setDraft] = useState<ConditionsDraft>(initial)
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

  const preview = useMemo(() => applyConditions(conditions, draft), [conditions, draft])
  const dirty = !deepEqual(draft, initial)

  function toggle<T>(key: keyof ConditionsDraft, value: T, order: readonly T[]) {
    setDraft((d) => {
      const cur = d[key] as unknown as T[]
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : order.filter((v) => v === value || cur.includes(v))
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
        aria-label="Edit conditions"
        onClick={(e) => e.stopPropagation()}
        className="relative my-4 w-full max-w-2xl rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-h3 font-semibold">Conditions</h2>
            <p className="text-xs text-subtle">The soil this plant tolerates — texture, how moist, and pH. Tick every type that suits.</p>
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
            <ConditionsCard conditions={preview} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Row label="Soil" hint="texture">
            {SOIL_TYPES.map((t) => (
              <Toggle key={t} on={draft.soil.includes(t)} onClick={() => toggle('soil', t, SOIL_TYPES)}>
                {conditionLabel(t)}
              </Toggle>
            ))}
          </Row>

          <Row label="Moisture" hint="dry → wet">
            {MOISTURE_LEVELS.map((m) => (
              <Toggle key={m} on={draft.moisture.includes(m)} onClick={() => toggle('moisture', m, MOISTURE_LEVELS)}>
                {conditionLabel(m)}
              </Toggle>
            ))}
          </Row>

          <Row label="pH">
            {PH_LEVELS.map((p) => (
              <Toggle key={p} on={draft.ph.includes(p)} onClick={() => toggle('ph', p, PH_LEVELS)}>
                {conditionLabel(p)}
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
