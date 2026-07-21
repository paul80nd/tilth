import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PlantNode } from '../schema/plant'

// Mock the Dexie seam — this suite characterises the modal's shell/orchestration behaviour
// (open, Esc-close, scroll-lock, dirty-gated save, error, clear), not persistence (feature
// tests cover editNode below React).
const { updateNode, clearNodeField } = vi.hoisted(() => ({
  updateNode: vi.fn(async () => {}),
  clearNodeField: vi.fn(async () => {}),
}))
vi.mock('../app/editNode', () => ({ updateNode, clearNodeField }))

import { SizeEditor } from './SizeEditor'

const node = (over: Partial<PlantNode> = {}): PlantNode =>
  ({ id: 'malus-domestica', rank: 'species', ...over }) as PlantNode

beforeEach(() => {
  updateNode.mockClear()
  clearNodeField.mockClear()
  document.body.style.overflow = ''
})

describe('SizeEditor (modal shell behaviour)', () => {
  it('renders a labelled dialog', () => {
    render(<SizeEditor node={node()} size={undefined} onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Edit size' })).toBeInTheDocument()
  })

  it('locks body scroll while open and restores it on unmount', () => {
    const { unmount } = render(<SizeEditor node={node()} size={undefined} onClose={() => {}} />)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<SizeEditor node={node()} size={undefined} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on the ✕ button', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<SizeEditor node={node()} size={undefined} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Save is disabled until the draft is dirty', async () => {
    const user = userEvent.setup()
    render(<SizeEditor node={node({ size: { height: '2m' } })} size={{ height: '2m' }} onClose={() => {}} />)
    // Unchanged draft (matches the resolved size) → Save is disabled and the seam is unreachable.
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.type(screen.getByPlaceholderText(/0.1–0.5m/), '!')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    expect(updateNode).not.toHaveBeenCalled()
  })

  it('a changed save calls updateNode with the folded size, then closes', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<SizeEditor node={node()} size={undefined} onClose={onClose} />)
    await user.type(screen.getByPlaceholderText(/0.1–0.5m/), '2m')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(updateNode).toHaveBeenCalledOnce())
    expect(updateNode).toHaveBeenCalledWith(expect.objectContaining({ id: 'malus-domestica' }), { size: { height: '2m' } })
    expect(onClose).toHaveBeenCalled()
  })

  it('surfaces a save error and stays open', async () => {
    updateNode.mockRejectedValueOnce(new Error('disk full'))
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<SizeEditor node={node()} size={undefined} onClose={onClose} />)
    await user.type(screen.getByPlaceholderText(/0.1–0.5m/), '2m')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('disk full')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Clear is disabled when the size is inherited (no own value)', () => {
    render(<SizeEditor node={node({ size: undefined })} size={{ height: '2m' }} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
  })

  it('Clear calls clearNodeField when the node owns a size', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<SizeEditor node={node({ size: { height: '2m' } })} size={{ height: '2m' }} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    await waitFor(() => expect(clearNodeField).toHaveBeenCalledWith('malus-domestica', 'size'))
    expect(onClose).toHaveBeenCalled()
  })
})
