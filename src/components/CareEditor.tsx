import { useMemo } from 'react'
import type { PlantNode, TaskTemplate } from '../schema/plant'
import { MONTH_INITIALS } from '../lib/calendar'
import { careDiff, newTaskDraft, toTaskDrafts, type TaskDraft } from '../lib/careEdit'
import { saveCareTasks } from '../app/tasks'
import { Toggle } from './EditorControls'
import { FieldEditorModal } from './FieldEditorModal'
import { useEditorDraft } from './useEditorDraft'

// A modal for editing the "Care" card — the plant's maintenance jobs (TaskTemplates). Each job is
// an editable row: action, the months it applies (none = Anytime), a note, and its cadence (a
// tickable one-off vs ongoing care). Jobs can be added or removed. A job inherited from an ancestor
// or category scope is editable here too, flagged "shared" since the change reaches every plant
// under that scope. Saving upserts changed/new jobs (stamped manual) and deletes removed ones.

/** A short id fragment for a hand-added job; readable, collision-safe enough for one plant. */
function freshId(nodeId: string): string {
  return `task-${nodeId}-${crypto.randomUUID().slice(0, 8)}`
}

export function CareEditor({
  node,
  ancestors,
  tasks,
  onClose,
}: {
  node: PlantNode
  ancestors: PlantNode[]
  /** The tasks the Care tile currently shows (own + inherited) — the editor's starting point. */
  tasks: TaskTemplate[]
  onClose: () => void
}) {
  const initial = useMemo(() => toTaskDrafts(tasks), [tasks])
  // Aliased to drafts/setDrafts so the job-row body reads naturally. Care has no field-inherit
  // "Clear" (jobs are whole records) and its own careDiff-based dirty, so no `clear` + a custom
  // isDirty. Save reconciles the drafts into upserts/deletes.
  const { draft: drafts, setDraft: setDrafts, saving, error, dirty, onSave } = useEditorDraft<TaskDraft[]>({
    initial,
    onClose,
    save: (ds) => {
      const { upserts, deletedIds } = careDiff(tasks, ds)
      return saveCareTasks(upserts, deletedIds)
    },
    isDirty: (ds) => {
      const { upserts, deletedIds } = careDiff(tasks, ds)
      return upserts.length > 0 || deletedIds.length > 0
    },
  })

  function setRow(i: number, patch: Partial<TaskDraft>) {
    setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  }
  function toggleMonth(i: number, month: number) {
    setDrafts((ds) =>
      ds.map((d, j) =>
        j === i
          ? { ...d, months: d.months.includes(month) ? d.months.filter((m) => m !== month) : [...d.months, month] }
          : d,
      ),
    )
  }
  function setCadence(i: number, value: 'once' | 'ongoing') {
    setRow(i, { cadence: drafts[i].cadence === value ? '' : value })
  }

  /** "shared · from Apple" / "shared · all fruit" for an inherited job; nothing for an own one. */
  function scopeNote(d: TaskDraft): string | undefined {
    if (d.scopeCategory) return `shared · all ${d.scopeCategory}`
    if (!d.scopeNodeId || d.scopeNodeId === node.id) return undefined
    const anc = ancestors.find((a) => a.id === d.scopeNodeId)
    return `shared · from ${anc?.commonName ?? anc?.botanicalName ?? d.scopeNodeId}`
  }

  return (
    <FieldEditorModal
      title="Care"
      subtitle="Maintenance jobs — months (none = anytime), a note, and whether each is a tickable one-off or ongoing care."
      ariaLabel="Edit care jobs"
      maxWidth="max-w-2xl"
      error={error}
      onClose={onClose}
      footer={
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
      }
    >
      <div className="flex flex-col gap-3">
          {drafts.map((d, i) => {
            const shared = scopeNote(d)
            return (
              <div key={d.id} className="rounded-lg border border-line bg-card p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={d.action}
                    placeholder="What to do (e.g. Winter prune)"
                    aria-label={`Job ${i + 1} action`}
                    onChange={(e) => setRow(i, { action: e.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm font-medium placeholder:text-subtle"
                  />
                  <button
                    type="button"
                    onClick={() => setDrafts((ds) => ds.filter((_, j) => j !== i))}
                    aria-label={`Remove job ${i + 1}`}
                    className="flex-none rounded-md px-2 py-1 text-muted hover:bg-sunken hover:text-ink"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {MONTH_INITIALS.map((label, idx) => {
                    const month = idx + 1
                    return (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`Month ${month}`}
                        aria-pressed={d.months.includes(month)}
                        onClick={() => toggleMonth(i, month)}
                        className={`size-7 rounded-md border text-xs font-medium transition-colors ${
                          d.months.includes(month)
                            ? 'border-brand bg-brand-tint text-brand-ink'
                            : 'border-line text-muted hover:bg-sunken hover:text-ink'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                  <span className="ml-1 text-xs text-subtle">{d.months.length === 0 ? 'anytime' : ''}</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Toggle on={d.cadence === 'once'} onClick={() => setCadence(i, 'once')}>
                    One-off
                  </Toggle>
                  <Toggle on={d.cadence === 'ongoing'} onClick={() => setCadence(i, 'ongoing')}>
                    Ongoing
                  </Toggle>
                  {shared && <span className="ml-auto text-xs text-accent-ink">{shared}</span>}
                </div>

                <input
                  type="text"
                  value={d.note}
                  placeholder="Note (optional) — the how-to"
                  aria-label={`Job ${i + 1} note`}
                  onChange={(e) => setRow(i, { note: e.target.value })}
                  className="mt-2 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm placeholder:text-subtle"
                />
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => setDrafts((ds) => [...ds, newTaskDraft(freshId(node.id), node.id)])}
            className="self-start rounded-md border border-dashed border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            + Add job
          </button>
        </div>
    </FieldEditorModal>
  )
}
