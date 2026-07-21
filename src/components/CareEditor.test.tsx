import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PlantNode, TaskTemplate } from '../schema/plant'

// The Care editor is the outlier: whole-record jobs (no field-inherit "Clear"), a careDiff-based
// dirty, and the saveCareTasks seam. This pins those distinctive behaviours after the migration
// onto the shared FieldEditorModal / useEditorDraft.
const { saveCareTasks } = vi.hoisted(() => ({
  saveCareTasks: vi.fn<(upserts: TaskTemplate[], deletedIds: string[]) => Promise<void>>(async () => {}),
}))
vi.mock('../app/tasks', () => ({ saveCareTasks }))

import { CareEditor } from './CareEditor'

const node = { id: 'malus-domestica', rank: 'species' } as PlantNode
const task = (over: Partial<TaskTemplate> = {}): TaskTemplate => ({
  id: 'task-1',
  action: 'Winter prune',
  months: [1, 2],
  scopeNodeId: 'malus-domestica',
  cadence: 'once',
  ...over,
})

beforeEach(() => {
  saveCareTasks.mockClear()
  document.body.style.overflow = ''
})

describe('CareEditor', () => {
  it('renders the jobs dialog with no Clear button (jobs are whole records)', () => {
    render(<CareEditor node={node} ancestors={[]} tasks={[task()]} onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Edit care jobs' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  it('Save is disabled until a job changes, then persists via saveCareTasks', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<CareEditor node={node} ancestors={[]} tasks={[task()]} onClose={onClose} />)

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    const action = screen.getByLabelText('Job 1 action')
    await user.type(action, ' hard')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saveCareTasks).toHaveBeenCalledOnce())
    const [upserts, deletedIds] = saveCareTasks.mock.calls[0]
    expect(upserts).toEqual([expect.objectContaining({ id: 'task-1', action: 'Winter prune hard' })])
    expect(deletedIds).toEqual([])
    expect(onClose).toHaveBeenCalled()
  })

  it('removing a job deletes it on save', async () => {
    const user = userEvent.setup()
    render(<CareEditor node={node} ancestors={[]} tasks={[task()]} onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Remove job 1' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saveCareTasks).toHaveBeenCalledOnce())
    const [upserts, deletedIds] = saveCareTasks.mock.calls[0]
    expect(upserts).toEqual([])
    expect(deletedIds).toEqual(['task-1'])
  })

  it('adding a blank job stays clean until it has an action', async () => {
    const user = userEvent.setup()
    render(<CareEditor node={node} ancestors={[]} tasks={[]} onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: '+ Add job' }))
    // A blank draft row isn't a real change yet — careDiff ignores actionless drafts.
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.type(screen.getByLabelText('Job 1 action'), 'Mulch')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })
})
