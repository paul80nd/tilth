import { useState } from 'react'
import { deepEqual } from '../lib/equal'

// The shared state + orchestration behind every cheatsheet field editor. Each editor loads a
// resolved (possibly inherited) value into an editable `draft`, tracks whether it's `dirty`
// against that starting point, and on save/clear runs a seam write wrapped in the same
// saving/error/close dance. Only the draft shape and the actual seam calls differ per field, so
// those are the parameters; everything else (the try/catch, the dirty gate, closing on success)
// lives here. Pairs with <FieldEditorModal>, which owns the surrounding chrome.

export interface EditorDraft<T> {
  draft: T
  setDraft: React.Dispatch<React.SetStateAction<T>>
  saving: boolean
  error: string | null
  /** Draft differs from the value first loaded — gates Save (an unchanged save writes nothing). */
  dirty: boolean
  /** Save when dirty (else just close): runs `save(draft)`, then closes; on throw, shows the error. */
  onSave: () => void | Promise<void>
  /** Clear the node's own value (no-op when the editor supplied no `clear`), then close. */
  onClear: () => void | Promise<void>
}

export function useEditorDraft<T>(opts: {
  /** The starting draft — memoise it in the caller so it stays stable across renders. */
  initial: T
  onClose: () => void
  /** Write the draft through the app seam (may branch, e.g. empty → clear the field instead). */
  save: (draft: T) => Promise<void>
  /** Remove the node's own value for this field so the card re-inherits. Omit if not clearable. */
  clear?: () => Promise<void>
  /** Override the default structural dirty check (used by editors whose draft ≠ stored shape). */
  isDirty?: (draft: T, initial: T) => boolean
}): EditorDraft<T> {
  const { initial, onClose, save, clear, isDirty } = opts
  const [draft, setDraft] = useState<T>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = (isDirty ?? ((d, i) => !deepEqual(d, i)))(draft, initial)

  async function run(action: () => Promise<void>, fallback: string) {
    setSaving(true)
    setError(null)
    try {
      await action()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : fallback)
      setSaving(false)
    }
  }

  const onSave = () => {
    if (!dirty) return onClose()
    return run(() => save(draft), 'Could not save.')
  }

  const onClear = () => {
    if (!clear) return
    return run(clear, 'Could not clear.')
  }

  return { draft, setDraft, saving, error, dirty, onSave, onClear }
}
