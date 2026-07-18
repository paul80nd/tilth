import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlotAnchor } from '../../lib/plot'
import { Field, SizeInput } from './fields'

// The plot-size editor as a modal (opened from the toolbar) rather than a permanent sidebar panel.
// Closes on Escape, backdrop click, or ✕; locks body scroll while open — the CheatsheetModal pattern.

const ANCHORS: PlotAnchor[] = ['NW', 'NE', 'SW', 'SE']

/** 2×2 corner picker — the highlighted corner stays fixed while the plot grows/shrinks. */
function AnchorPicker({ value, onChange }: { value: PlotAnchor; onChange: (a: PlotAnchor) => void }) {
  return (
    <div className="grid w-20 grid-cols-2 gap-1">
      {ANCHORS.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          aria-label={`Fix ${a} corner`}
          aria-pressed={value === a}
          className={['h-9 rounded-sm text-xs font-semibold', value === a ? 'bg-brand text-onbrand' : 'bg-sunken text-muted hover:text-ink'].join(' ')}
        >
          {a}
        </button>
      ))}
    </div>
  )
}

export interface PlotSizeModalProps {
  plot: { width: number; height: number }
  onResize: (size: { width?: number; height?: number }, anchor: PlotAnchor) => void
  onClose: () => void
}

export function PlotSizeModal({ plot, onResize, onClose }: PlotSizeModalProps) {
  const [anchor, setAnchor] = useState<PlotAnchor>('NW')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Plot size"
        onClick={(e) => e.stopPropagation()}
        className="relative my-8 w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Plot size</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-sunken hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Width (m)">
            <SizeInput value={plot.width} min={1} step={0.1} onCommit={(w) => onResize({ width: w }, anchor)} />
          </Field>
          <Field label="Height (m)">
            <SizeInput value={plot.height} min={1} step={0.1} onCommit={(h) => onResize({ height: h }, anchor)} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Fixed corner">
            <AnchorPicker value={anchor} onChange={setAnchor} />
          </Field>
        </div>

        <p className="mt-3 text-[0.7rem] leading-snug text-subtle">
          Resizing keeps this corner fixed and grows/shrinks from the opposite side; your beds keep
          their place against it.
        </p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-onbrand hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
