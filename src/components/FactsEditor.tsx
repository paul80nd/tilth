import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { PlantNode } from '../schema/plant'
import { updateNode, clearNodeField } from '../app/editNode'
import { listFactKeys } from '../app/plants'
import { fromFactsDraft, toFactsDraft, factKeySuggestions, type FactRow } from '../lib/factsEdit'
import { EditorFooter } from './EditorControls'
import { FieldEditorModal } from './FieldEditorModal'
import { useEditorDraft } from './useEditorDraft'

const KEY_SUGGESTIONS_ID = 'facts-key-suggestions'

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
  // Aliased to rows/setRows so the row-editing body reads naturally.
  const { draft: rows, setDraft: setRows, saving, error, dirty, onSave, onClear } = useEditorDraft<FactRow[]>({
    initial,
    onClose,
    save: (rs) => updateNode(node, { facts: fromFactsDraft(rs) }),
    clear: () => clearNodeField(node.id, 'facts'),
  })

  const preview = useMemo(() => fromFactsDraft(rows), [rows])
  const previewEntries = Object.entries(preview)
  const canClear = node.facts !== undefined

  // Suggest fact keys used elsewhere in the collection that this draft hasn't used yet, so a new
  // fact is worded like the existing ones (e.g. everything says "spacing").
  const collectionKeys = useLiveQuery(listFactKeys, [], [] as string[])
  const keySuggestions = useMemo(
    () => factKeySuggestions(collectionKeys, rows.map((r) => r.key)),
    [collectionKeys, rows],
  )

  function setRow(i: number, patch: Partial<FactRow>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  return (
    <FieldEditorModal
      title="More facts"
      subtitle="Free labelled facts shown as chips (e.g. spacing → 20cm)."
      ariaLabel="Edit more facts"
      error={error}
      onClose={onClose}
      previewClassName="p-4"
      preview={
        previewEntries.length > 0 ? (
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
        )
      }
      footer={<EditorFooter onClear={onClear} canClear={canClear} onCancel={onClose} onSave={onSave} saving={saving} saveDisabled={!dirty} />}
    >
      <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={row.key}
                placeholder="label"
                aria-label={`Fact ${i + 1} label`}
                list={KEY_SUGGESTIONS_ID}
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
          {/* Shared across the key inputs — existing labels from the collection not yet used here. */}
          <datalist id={KEY_SUGGESTIONS_ID}>
            {keySuggestions.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
      </div>
    </FieldEditorModal>
  )
}
