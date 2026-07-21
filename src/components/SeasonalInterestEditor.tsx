import { useMemo } from 'react'
import type { PlantNode, SeasonalInterest } from '../schema/plant'
import { updateNode, clearNodeField } from '../app/editNode'
import { seasonalInterest } from '../lib/calendar'
import { deepEqual } from '../lib/equal'
import { COLOUR_WORDS } from '../lib/colour'
import {
  EDIT_PARTS,
  EDIT_SEASONS,
  fromDraft,
  toDraft,
  type InterestDraft,
} from '../lib/seasonalEdit'
import { INTEREST_META } from '../lib/calendar'
import { SeasonalIcon } from './icons'
import SeasonStrip from './SeasonStrip'
import { EditorFooter } from './EditorControls'
import { FieldEditorModal } from './FieldEditorModal'
import { useEditorDraft } from './useEditorDraft'

// A modal for editing a plant's seasonal-interest grid — a cell per season × part (foliage ·
// flower · fruit · stem) with an on-show tick and a comma-separated colour field — alongside a
// LIVE preview of the exact strip the cheatsheet will show. Pre-filled from the resolved value
// (so an inherited grid is the starting point); saving writes the node's own grid through the
// normal merge seam, which overrides the inheritance. Unchanged → no write (keeps provenance).

const COLOUR_LIST_ID = 'tl-colour-words'

export function SeasonalInterestEditor({
  node,
  initial,
  onClose,
}: {
  node: PlantNode
  /** The resolved (possibly inherited) grid currently shown — the editor's starting point. */
  initial: SeasonalInterest | undefined
  onClose: () => void
}) {
  const initialDraft = useMemo(() => toDraft(initial), [initial])
  const { draft, setDraft, saving, error, dirty, onSave, onClear } = useEditorDraft<InterestDraft>({
    initial: initialDraft,
    onClose,
    save: (d) => updateNode(node, { seasonalInterest: fromDraft(d) }),
    clear: () => clearNodeField(node.id, 'seasonalInterest'),
    // Dirty compares the FOLDED draft against the resolved grid (two drafts can fold equal), so a
    // no-op edit still writes nothing.
    isDirty: (d) => !deepEqual(fromDraft(d), initial ?? {}),
  })

  // Rebuilt on every keystroke → the preview is exactly what the cheatsheet will render.
  const next = useMemo(() => fromDraft(draft), [draft])
  const preview = useMemo(() => seasonalInterest(next), [next])
  const canClear = node.seasonalInterest !== undefined

  function setCell(season: (typeof EDIT_SEASONS)[number], part: (typeof EDIT_PARTS)[number], patch: Partial<InterestDraft[typeof season][typeof part]>) {
    setDraft((d) => ({
      ...d,
      [season]: { ...d[season], [part]: { ...d[season][part], ...patch } },
    }))
  }

  return (
    <FieldEditorModal
      title="Seasonal interest"
      subtitle="Tick a part to mark it on show that season; add colours (comma-separated) to tint it."
      ariaLabel="Edit seasonal interest"
      maxWidth="max-w-3xl"
      preview={<SeasonStrip interest={preview} />}
      previewClassName="h-36"
      error={error}
      onClose={onClose}
      footer={<EditorFooter onClear={onClear} canClear={canClear} onCancel={onClose} onSave={onSave} saving={saving} saveDisabled={!dirty} />}
    >
      <datalist id={COLOUR_LIST_ID}>
        {COLOUR_WORDS.map((w) => (
          <option key={w} value={w} />
        ))}
      </datalist>

      {/* The grid of controls: a row per part, a column per season. */}
      <div className="overflow-x-auto">
          <div className="grid min-w-[34rem] grid-cols-[7rem_repeat(4,minmax(0,1fr))] gap-x-3 gap-y-2">
            <div />
            {EDIT_SEASONS.map((s) => (
              <div key={s} className="text-center text-[0.65rem] font-semibold uppercase tracking-wide text-subtle">
                {s}
              </div>
            ))}

            {EDIT_PARTS.map((part) => (
              <div key={part} className="contents">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <SeasonalIcon part={part} size={18} aria-hidden="true" />
                  {INTEREST_META[part].label}
                </div>
                {EDIT_SEASONS.map((season) => {
                  const cell = draft[season][part]
                  return (
                    <div key={season} className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={cell.on}
                        aria-label={`${INTEREST_META[part].label} in ${season}`}
                        onChange={(e) => setCell(season, part, { on: e.target.checked })}
                        className="h-4 w-4 shrink-0 accent-brand"
                      />
                      <input
                        type="text"
                        value={cell.colours}
                        list={COLOUR_LIST_ID}
                        placeholder="colours"
                        disabled={!cell.on}
                        // Typing a colour marks the part on show; clearing it leaves it on (blank = on, uncoloured).
                        onChange={(e) => setCell(season, part, { colours: e.target.value, on: cell.on || e.target.value.trim() !== '' })}
                        className="w-full rounded-md border border-line bg-card px-2 py-1 text-sm placeholder:text-subtle disabled:opacity-40"
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
    </FieldEditorModal>
  )
}
