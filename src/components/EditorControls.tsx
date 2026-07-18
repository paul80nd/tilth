// Small shared presentational controls for the cheatsheet field editors (Position, Conditions):
// a labelled row of toggle chips. Stateless — the editor owns the draft and toggle logic.

export function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-muted">{label}</span>
        {hint && <span className="text-xs text-subtle">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

// The shared footer for the cheatsheet field editors: Clear on the left (removes the node's own
// value for this card so it inherits from a parent again — disabled when there's nothing own to
// clear), Cancel + Save on the right.
export function EditorFooter({
  onClear,
  canClear,
  onCancel,
  onSave,
  saving,
  saveDisabled,
}: {
  onClear: () => void
  canClear: boolean
  onCancel: () => void
  onSave: () => void
  saving: boolean
  saveDisabled: boolean
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onClear}
        disabled={!canClear || saving}
        title={canClear ? 'Clear this section so it inherits from a parent' : 'Nothing to clear — this is inherited'}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-tint disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Clear
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || saveDisabled}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-onbrand hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-sm font-medium transition-colors ${
        on ? 'border-brand bg-brand-tint text-brand-ink' : 'border-line text-muted hover:bg-sunken hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
