import { useMemo } from 'react'
import type { Position, PlantNode } from '../schema/plant'
import { updateNode, clearNodeField } from '../app/editNode'
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
import { FieldEditorModal } from './FieldEditorModal'
import { useEditorDraft } from './useEditorDraft'

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
  const { draft, setDraft, saving, error, dirty, onSave, onClear } = useEditorDraft<PositionDraft>({
    initial,
    onClose,
    // An all-empty draft means "own nothing here" → drop the field so it re-inherits.
    save: (d) => {
      const p = applyPosition(d)
      return Object.keys(p).length === 0 ? clearNodeField(node.id, 'position') : updateNode(node, { position: p })
    },
    clear: () => clearNodeField(node.id, 'position'),
  })

  // The draft folded into a Position — exactly what the card will render.
  const preview = useMemo(() => applyPosition(draft), [draft])

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

  return (
    <FieldEditorModal
      title="Position"
      subtitle="Where this plant wants to grow — light, the aspect it faces, shelter, and hardiness."
      ariaLabel="Edit position"
      maxWidth="max-w-2xl"
      preview={<PositionCard position={preview} />}
      previewClassName="h-32"
      error={error}
      onClose={onClose}
      footer={<EditorFooter onClear={onClear} canClear={canClear} onCancel={onClose} onSave={onSave} saving={saving} saveDisabled={!dirty} />}
    >
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
    </FieldEditorModal>
  )
}
