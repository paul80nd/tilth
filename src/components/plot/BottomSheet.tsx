import { cx } from '../../lib/cx'

// A collapsible bottom sheet for the mobile garden planner — the right-hand inspector/shopping
// column relocated to a panel that sits over the bottom of the canvas. Collapsed it's just a
// tappable header bar (a grab handle + title); expanded it reveals its scrollable content. The
// page opens it automatically when something is selected. Absolutely positioned, so its container
// must be `relative`.

export interface BottomSheetProps {
  /** Header label — reflects what's inside (the selection, or the browse view). */
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

export default function BottomSheet({ title, expanded, onToggle, children }: BottomSheetProps) {
  return (
    <div
      className={cx(
        'absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-xl border-t border-line bg-card shadow-lg transition-[max-height] duration-200 ease-soft',
        expanded ? 'max-h-[65%]' : 'max-h-12',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex h-12 flex-none items-center gap-2 px-4"
      >
        <span aria-hidden className="absolute inset-x-0 top-1.5 mx-auto h-1 w-9 rounded-full bg-line-strong" />
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span aria-hidden className="ml-auto text-muted">
          {expanded ? '▾' : '▴'}
        </span>
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
