import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Characterises the add-form wiring the mapping-in-lib refactor was meant to restore: submitting
// builds the create fragment and calls the createNode seam, then navigates. The mapping itself is
// unit-tested in lib/plantForm.test.ts; here the seam + router are mocked so only the page wiring
// is under test.
const { createNode, updateNode } = vi.hoisted(() => ({
  createNode: vi.fn(async () => {}),
  updateNode: vi.fn(async () => {}),
}))
vi.mock('../app/editNode', () => ({ createNode, updateNode, MANUAL_SOURCE: 'manual' }))

const navigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigate, useParams: () => ({}) }
})

import PlantFormPage from './PlantFormPage'

beforeEach(() => {
  createNode.mockClear()
  navigate.mockClear()
})

function renderAddForm() {
  return render(
    <MemoryRouter>
      <PlantFormPage />
    </MemoryRouter>,
  )
}

describe('PlantFormPage (add mode)', () => {
  it('disables submit until the plant has an identity', async () => {
    renderAddForm()
    // The add form seeds synchronously, but useLiveQuery(listNodes) gates on the empty store.
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Add plant' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Add plant' })).toBeDisabled()
  })

  it('previews the generated id from the typed name', async () => {
    const user = userEvent.setup()
    renderAddForm()
    await waitFor(() => screen.getByRole('heading', { name: 'Add plant' }))
    await user.type(screen.getByPlaceholderText('Rhubarb'), 'Rhubarb')
    expect(screen.getByText('rhubarb')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add plant' })).toBeEnabled()
  })

  it('submitting creates the node from the form and navigates to it', async () => {
    const user = userEvent.setup()
    renderAddForm()
    await waitFor(() => screen.getByRole('heading', { name: 'Add plant' }))

    await user.type(screen.getByPlaceholderText('Rhubarb'), 'Rhubarb')
    await user.type(screen.getByPlaceholderText('Raspberry Red'), 'Timperley Early')
    await user.click(screen.getByRole('button', { name: 'Add plant' }))

    await waitFor(() => expect(createNode).toHaveBeenCalledOnce())
    expect(createNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rhubarb-timperley-early', commonName: 'Rhubarb', variety: 'Timperley Early', rank: 'cultivar' }),
    )
    expect(navigate).toHaveBeenCalledWith('/plant/rhubarb-timperley-early')
  })
})
