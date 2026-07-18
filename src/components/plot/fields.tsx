import { useEffect, useState } from 'react'

// Shared form primitives for the garden-planner inspector + plot-size modal.

export const inputCls = 'rounded-md border border-line bg-card px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Trim float artefacts for display (2 dp is finer than we ever snap to). */
export const fmt = (n: number) => String(Math.round(n * 100) / 100)

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}

/** A metre value the user types. Commits on blur / Enter (not per keystroke) so decimals aren't
 *  clobbered mid-type and an anchored plot resize isn't corrupted by intermediate clamps. */
export function SizeInput({ value, min, step, onCommit }: { value: number; min: number; step: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(fmt(value))
  useEffect(() => setDraft(fmt(value)), [value])
  const commit = () => {
    const n = parseFloat(draft)
    if (Number.isFinite(n)) onCommit(n)
    else setDraft(fmt(value))
  }
  return (
    <input
      type="number"
      min={min}
      step={step}
      className={inputCls}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}
