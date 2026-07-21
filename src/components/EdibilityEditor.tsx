import { useMemo } from 'react'
import type { PlantNode } from '../schema/plant'
import { updateNode, clearNodeFields } from '../app/editNode'
import { fromEdibilityDraft, toEdibilityDraft, type EdibilityDraft } from '../lib/edibilityEdit'
import { EdibilityFacts } from './KeyFacts'
import { EditorFooter } from './EditorControls'
import { FieldEditorModal } from './FieldEditorModal'
import { useEditorDraft } from './useEditorDraft'

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
  const { draft, setDraft, saving, error, dirty, onSave, onClear } = useEditorDraft<EdibilityDraft>({
    initial,
    onClose,
    save: (d) => {
      const p = fromEdibilityDraft(d)
      return updateNode(node, { edible: p.edible, toxicity: p.toxicity })
    },
    clear: () => clearNodeFields(node.id, ['edible', 'toxicity']),
  })

  const preview = useMemo(() => fromEdibilityDraft(draft), [draft])
  const canClear = node.edible !== undefined || node.toxicity !== undefined

  return (
    <FieldEditorModal
      title="Edibility"
      subtitle="Which parts you can eat, and any caution. Free text."
      ariaLabel="Edit edibility"
      preview={<EdibilityFacts edible={preview.edible} toxicity={preview.toxicity || undefined} />}
      previewClassName="p-4"
      error={error}
      onClose={onClose}
      footer={<EditorFooter onClear={onClear} canClear={canClear} onCancel={onClose} onSave={onSave} saving={saving} saveDisabled={!dirty} />}
    >
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
    </FieldEditorModal>
  )
}
