import { useMemo } from 'react'
import type { Conditions, PlantNode } from '../schema/plant'
import { updateNode, clearNodeField } from '../app/editNode'
import {
  MOISTURE_LEVELS,
  PH_LEVELS,
  SOIL_TYPES,
  conditionLabel,
} from '../lib/conditions'
import { applyConditions, toConditionsDraft, type ConditionsDraft } from '../lib/conditionsEdit'
import ConditionsCard from './ConditionsCard'
import { Row, Toggle, EditorFooter } from './EditorControls'
import { FieldEditorModal } from './FieldEditorModal'
import { useEditorDraft } from './useEditorDraft'

// A modal for editing the growing-condition facets (soil · moisture · pH) with a live preview of
// the exact card the cheatsheet shows. Conditions is its own field (sibling of the Position card's
// light/aspect/exposure/hardiness), so editing it never touches Position. Saving writes the node's
// own conditions via the normal merge seam (stamped `manual`); an unchanged edit writes nothing;
// clearing removes the field so the card re-inherits.

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
  const { draft, setDraft, saving, error, dirty, onSave, onClear } = useEditorDraft<ConditionsDraft>({
    initial,
    onClose,
    // An all-empty draft means "own nothing here" → drop the field so it re-inherits.
    save: (d) => {
      const p = applyConditions(d)
      return Object.keys(p).length === 0 ? clearNodeField(node.id, 'conditions') : updateNode(node, { conditions: p })
    },
    clear: () => clearNodeField(node.id, 'conditions'),
  })

  const preview = useMemo(() => applyConditions(draft), [draft])

  function toggle<T>(key: keyof ConditionsDraft, value: T, order: readonly T[]) {
    setDraft((d) => {
      const cur = d[key] as unknown as T[]
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : order.filter((v) => v === value || cur.includes(v))
      return { ...d, [key]: next }
    })
  }

  // Clearing Conditions removes the node's own field so the card inherits from a parent again.
  // Only enabled when the node asserts a soil facet itself.
  const own = node.conditions
  const canClear = !!(own && (own.soil?.length || own.moisture?.length || own.ph?.length))

  return (
    <FieldEditorModal
      title="Conditions"
      subtitle="The soil this plant tolerates — texture, how moist, and pH. Tick every type that suits."
      ariaLabel="Edit conditions"
      maxWidth="max-w-2xl"
      preview={<ConditionsCard conditions={preview} />}
      previewClassName="h-32"
      error={error}
      onClose={onClose}
      footer={<EditorFooter onClear={onClear} canClear={canClear} onCancel={onClose} onSave={onSave} saving={saving} saveDisabled={!dirty} />}
    >
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
    </FieldEditorModal>
  )
}
