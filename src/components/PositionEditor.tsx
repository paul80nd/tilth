import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Position, PlantNode } from '../schema/plant'
import { updateNode, clearNodeField } from '../app/editNode'
import { deepEqual } from '../lib/equal'
import {
  CARDINALS,
  EXPOSURE_LEVELS,
  HARDINESS_RATINGS,
  LIGHT_LEVELS,
  conditionLabel,
} from '../lib/conditions'
import { applyPosition, toPositionDraft, type PositionDraft } from '../lib/positionEdit'
import PositionCard from './PositionCard'
import { Row, Toggle, EditorFooter } from './EditorControls'

// A modal for editing the Position facets (light · aspect · exposure · hardiness) with a live
// preview of the exact card the cheatsheet shows. Position is its own field (sibling of the
// Conditions card's soil/moisture/ph), so editing it never touches Conditions. Saving writes the
// node's own position via the normal merge seam (stamped `manual`); an unchanged edit writes
// nothing; clearing removes the field so the card re-inherits.

const HARDINESS = HARDINESS_RATINGS

export function PositionEditor({
  node,
  position,
  onClose,
}: {
  node: PlantNode
  /** The resolved (possibly inherited) position currently shown — the editor's starting point. */
  position: Position | undefined
  onClose: () => void
}) {
  const initial = useMemo(() => toPositionDraft(position), [position])
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

  // The draft folded into a Position — exactly what the card will render.
  const preview = useMemo(() => applyPosition(draft), [draft])
  const dirty = !deepEqual(draft, initial)

  function toggle<T>(key: 'sun' | 'aspect' | 'exposure', value: T, order: readonly T[]) {
    setDraft((d) => {
      const cur = d[key] as unknown as T[]
      const has = cur.includes(value)
      const next = has ? cur.filter((v) => v !== value) : order.filter((v) => v === value || cur.includes(v))
      return { ...d, [key]: next }
    })
  }

  // Clearing Position removes the node's own field so the card inherits from a parent again. Only
  // enabled when the node asserts a position facet itself.
  const own = node.position
  const canClear = !!(own && (own.sun?.length || own.aspect?.length || own.exposure?.length || own.hardiness))

  async function onSave() {
    if (!dirty) return onClose()
    setSaving(true)
    setError(null)
    try {
      // An all-empty draft means "own nothing here" → drop the field so it re-inherits.
      if (Object.keys(preview).length === 0) await clearNodeField(node.id, 'position')
      else await updateNode(node, { position: preview })
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
      await clearNodeField(node.id, 'position')
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
            <PositionCard position={preview} />
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

        <EditorFooter onClear={onClear} canClear={canClear} onCancel={onClose} onSave={onSave} saving={saving} saveDisabled={!dirty} />
      </div>
    </div>,
    document.body,
  )
}
