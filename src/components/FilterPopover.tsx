import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A button that opens a popover of secondary controls (mirrors Forkast's Browse filter
 * pattern). Keeps a toolbar calm: the button stays inline while the growing list of controls
 * tucks behind it. Closes on outside click and Escape. `count` shows an active-count badge.
 */
export function FilterPopover({
  label,
  count = 0,
  align = 'right',
  width = 220,
  children,
}: {
  label: string
  count?: number
  align?: 'left' | 'right'
  width?: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const active = count > 0 || open
  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-medium transition-colors ${
          active ? 'border-brand bg-brand-tint text-brand-ink' : 'border-line bg-card text-muted hover:bg-sunken hover:text-ink'
        }`}
      >
        {label}
        {count > 0 && (
          <span className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
        <span aria-hidden className="text-[10px]">▾</span>
      </button>
      {open && (
        <div
          role="dialog"
          style={{ width }}
          className={`absolute top-[calc(100%+6px)] z-40 rounded-lg border border-line bg-card p-3 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </span>
  )
}
