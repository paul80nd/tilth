import { cx } from '../../lib/cx'

// A left slide-in drawer for the mobile garden planner — the plant palette relocated off-canvas,
// opened from the toolbar. A tap on the dimmed backdrop (or arming a plant) closes it. Absolutely
// positioned over the whole planner area, so its container must be `relative`.

export interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  /** Accessible label for the drawer panel. */
  label: string
  children: React.ReactNode
}

export default function MobileDrawer({ open, onClose, label, children }: MobileDrawerProps) {
  return (
    <div className={cx('absolute inset-0 z-30', open ? '' : 'pointer-events-none')} aria-hidden={!open}>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={cx('absolute inset-0 bg-black/40 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0')}
      />
      {/* panel */}
      <div
        role="dialog"
        aria-label={label}
        className={cx(
          'absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col border-r border-line bg-card shadow-lg transition-transform duration-200 ease-soft',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {children}
      </div>
    </div>
  )
}
