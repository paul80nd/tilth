import { useMemo } from 'react'
import type { PlantNode, Size } from '../schema/plant'
import { updateNode, clearNodeField } from '../app/editNode'
import { fromSizeDraft, toSizeDraft, type SizeDraft } from '../lib/sizeEdit'
import SizeCard from './SizeCard'
import { EditorFooter } from './EditorControls'
import { FieldEditorModal } from './FieldEditorModal'
import { useEditorDraft } from './useEditorDraft'

// A modal for editing the ultimate size (height · spread · time to size) with a live preview of the
// to-scale Size card. The three values are free text kept verbatim as labels (the card parses them
// for the drawing) — bands, cm/m and "12m+"/"2–5 years" all work. Saving writes the node's own size
// via the normal merge seam (stamped `manual`); an unchanged edit writes nothing.

const FIELDS: Array<{ key: keyof SizeDraft; label: string; placeholder: string }> = [
  { key: 'height', label: 'Height', placeholder: 'e.g. 0.1–0.5m or 2-4m' },
  { key: 'spread', label: 'Spread', placeholder: 'e.g. 0.5m' },
  { key: 'timeToSize', label: 'Time to full size', placeholder: 'e.g. 2–5 years' },
]

export function SizeEditor({
  node,
  size,
  onClose,
}: {
  node: PlantNode
  /** The resolved (possibly inherited) size currently shown — the editor's starting point. */
  size: Size | undefined
  onClose: () => void
}) {
  const initial = useMemo(() => toSizeDraft(size), [size])
  const { draft, setDraft, saving, error, dirty, onSave, onClear } = useEditorDraft<SizeDraft>({
    initial,
    onClose,
    save: (d) => updateNode(node, { size: fromSizeDraft(d) }),
    clear: () => clearNodeField(node.id, 'size'),
  })

  const preview = useMemo(() => fromSizeDraft(draft), [draft])
  const canClear = node.size !== undefined

  return (
    <FieldEditorModal
      title="Size"
      subtitle="Ultimate height and spread, and how long it takes to get there. Free text — bands, cm or m."
      ariaLabel="Edit size"
      preview={<SizeCard size={preview} />}
      error={error}
      onClose={onClose}
      footer={<EditorFooter onClear={onClear} canClear={canClear} onCancel={onClose} onSave={onSave} saving={saving} saveDisabled={!dirty} />}
    >
      <div className="flex flex-col gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted">{f.label}</span>
            <input
              type="text"
              value={draft[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-sm placeholder:text-subtle"
            />
          </label>
        ))}
      </div>
    </FieldEditorModal>
  )
}
