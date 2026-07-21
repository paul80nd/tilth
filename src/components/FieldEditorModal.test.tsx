import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FieldEditorModal } from './FieldEditorModal'

beforeEach(() => {
  document.body.style.overflow = ''
})

function open(props: Partial<React.ComponentProps<typeof FieldEditorModal>> = {}) {
  const onClose = props.onClose ?? vi.fn()
  const result = render(
    <FieldEditorModal
      title="Size"
      subtitle="Ultimate height and spread."
      ariaLabel="Edit size"
      footer={<button>Save</button>}
      onClose={onClose}
      {...props}
    >
      <p>body</p>
    </FieldEditorModal>,
  )
  return { onClose, ...result }
}

describe('FieldEditorModal', () => {
  it('renders a labelled dialog with title, subtitle, body and footer', () => {
    open()
    const dialog = screen.getByRole('dialog', { name: 'Edit size' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Size' })).toBeInTheDocument()
    expect(screen.getByText('Ultimate height and spread.')).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('locks body scroll while open and restores it on unmount', () => {
    document.body.style.overflow = 'scroll'
    const { unmount } = render(
      <FieldEditorModal title="t" subtitle="s" ariaLabel="a" footer={null} onClose={() => {}}>
        x
      </FieldEditorModal>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const { onClose } = open()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on the ✕ button', async () => {
    const user = userEvent.setup()
    const { onClose } = open()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on a backdrop click but not on a click inside the dialog', async () => {
    const user = userEvent.setup()
    const { onClose } = open()
    const dialog = screen.getByRole('dialog', { name: 'Edit size' })
    await user.click(dialog)
    expect(onClose).not.toHaveBeenCalled()
    // The backdrop is the dialog's parent; clicking it closes.
    await user.click(dialog.parentElement as HTMLElement)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows the preview block only when a preview is supplied', () => {
    const { unmount } = open()
    expect(screen.queryByText('Preview')).not.toBeInTheDocument()
    unmount()
    open({ preview: <span>chart</span> })
    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.getByText('chart')).toBeInTheDocument()
  })

  it('renders an error line only when error is set', () => {
    const { unmount } = open()
    expect(screen.queryByText('boom')).not.toBeInTheDocument()
    unmount()
    open({ error: 'boom' })
    expect(screen.getByText('boom')).toBeInTheDocument()
  })
})
