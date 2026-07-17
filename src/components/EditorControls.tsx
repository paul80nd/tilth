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
