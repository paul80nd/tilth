import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// The shared shell for every cheatsheet field editor: a centred modal dialog rendered into
// document.body, closing on Escape / backdrop / the ✕, and locking body scroll while open. It
// owns the chrome (header, optional live-preview block, error line, footer slot); each editor
// supplies its own title, body controls, and footer. Pairs with useEditorDraft, which owns the
// draft state + save/clear orchestration.

export function FieldEditorModal({
  title,
  subtitle,
  ariaLabel,
  maxWidth = 'max-w-xl',
  preview,
  previewClassName,
  error,
  footer,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  ariaLabel: string
  /** Tailwind max-width for the dialog (default `max-w-xl`). */
  maxWidth?: string
  /** Live-preview card shown above the controls; omit for editors with no preview. */
  preview?: ReactNode
  /** Extra classes on the preview frame (e.g. `h-32` to fix height, `p-4` to pad). */
  previewClassName?: string
  error?: string | null
  /** The action row (usually <EditorFooter>). */
  footer: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        className={`relative my-4 w-full ${maxWidth} rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6`}
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-h3 font-semibold">{title}</h2>
            <p className="text-xs text-subtle">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-sunken hover:text-ink"
          >
            ✕
          </button>
        </div>

        {preview !== undefined && (
          <div className="mb-5">
            <div className="mb-1.5 text-[0.6rem] font-medium uppercase tracking-wide text-subtle">Preview</div>
            <div className={`overflow-hidden rounded-lg border border-line bg-card${previewClassName ? ` ${previewClassName}` : ''}`}>
              {preview}
            </div>
          </div>
        )}

        {children}

        {error && <p className="mt-3 text-sm text-accent-ink">{error}</p>}

        {footer}
      </div>
    </div>,
    document.body,
  )
}
