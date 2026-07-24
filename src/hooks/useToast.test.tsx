import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from './useToast'

// A tiny harness: a button that raises a toast with the given options when clicked.
function Raise({ options }: { options: Parameters<ReturnType<typeof useToast>>[0] }) {
  const toast = useToast()
  return <button onClick={() => toast(options)}>raise</button>
}

function setup(options: Parameters<ReturnType<typeof useToast>>[0]) {
  return render(
    <ToastProvider>
      <Raise options={options} />
    </ToastProvider>,
  )
}

describe('ToastProvider / useToast', () => {
  it('shows a message only after one is raised', async () => {
    const user = userEvent.setup()
    setup({ message: 'Deleted Rhubarb' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'raise' }))
    expect(screen.getByRole('status')).toHaveTextContent('Deleted Rhubarb')
  })

  it('runs the action then dismisses', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    setup({ message: 'Deleted Rhubarb', action: 'Undo', onAction, duration: 0 })
    await user.click(screen.getByRole('button', { name: 'raise' }))
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onAction).toHaveBeenCalledOnce()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('throws when used outside a provider', () => {
    // Silence React's error logging for the expected throw.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Raise options={{ message: 'x' }} />)).toThrow(/ToastProvider/)
    spy.mockRestore()
  })
})
