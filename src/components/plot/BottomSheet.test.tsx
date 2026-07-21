import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BottomSheet from './BottomSheet'

describe('BottomSheet', () => {
  it('shows its title and content', () => {
    render(
      <BottomSheet title="Raised bed 1" expanded onToggle={() => {}}>
        <p>sheet body</p>
      </BottomSheet>,
    )
    expect(screen.getByText('Raised bed 1')).toBeInTheDocument()
    expect(screen.getByText('sheet body')).toBeInTheDocument()
  })

  it('toggles when the header is tapped', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(
      <BottomSheet title="Beds & shopping" expanded={false} onToggle={onToggle}>
        <p>body</p>
      </BottomSheet>,
    )
    await user.click(screen.getByRole('button', { name: /Beds & shopping/ }))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('reflects expanded state to assistive tech', () => {
    const { rerender } = render(
      <BottomSheet title="X" expanded={false} onToggle={() => {}}>
        <p>body</p>
      </BottomSheet>,
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
    rerender(
      <BottomSheet title="X" expanded onToggle={() => {}}>
        <p>body</p>
      </BottomSheet>,
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })
})
