import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MobileDrawer from './MobileDrawer'

describe('MobileDrawer', () => {
  it('renders its labelled panel and children', () => {
    render(
      <MobileDrawer open onClose={() => {}} label="Plants">
        <p>palette</p>
      </MobileDrawer>,
    )
    expect(screen.getByRole('dialog', { name: 'Plants' })).toBeInTheDocument()
    expect(screen.getByText('palette')).toBeInTheDocument()
  })

  it('closes when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <MobileDrawer open onClose={onClose} label="Plants">
        <p>palette</p>
      </MobileDrawer>,
    )
    // The backdrop is the first child (behind the panel); clicking it dismisses the drawer.
    await user.click(container.querySelector('.bg-black\\/40')!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('is inert (not interactive) when closed', () => {
    render(
      <MobileDrawer open={false} onClose={() => {}} label="Plants">
        <p>palette</p>
      </MobileDrawer>,
    )
    // Hidden from assistive tech and non-interactive while off-canvas.
    expect(screen.getByRole('dialog', { name: 'Plants', hidden: true })).toBeInTheDocument()
  })
})
