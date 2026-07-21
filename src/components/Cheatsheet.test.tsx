import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PlantNode, TaskTemplate } from '../schema/plant'
import { CheatsheetContent } from './Cheatsheet'

// Characterises the cheatsheet's edit-orchestration: each card's Edit button opens that field's
// editor, only one is open at a time, and closing dismisses it. Guards the data-driven editor
// registry refactor. The editors themselves are covered by their own suites; here we only assert
// the wiring, so the Dexie seams are never reached (nothing is saved).
beforeEach(() => {
  document.body.style.overflow = ''
})

const node = {
  id: 'malus-domestica',
  rank: 'species',
  commonName: 'Apple',
  size: { height: '2m' },
  position: { sun: ['full-sun'] },
  conditions: { soil: ['loam'] },
  facts: { spacing: '4m' },
  edible: ['fruit'],
} as PlantNode

const tasks: TaskTemplate[] = [
  { id: 'task-1', action: 'Winter prune', months: [1], scopeNodeId: 'malus-domestica', cadence: 'once' },
]

function renderSheet() {
  return render(<CheatsheetContent node={node} ancestors={[]} guides={[]} tasks={tasks} />)
}

/** The Edit button within the tile whose heading is `title`. */
function editIn(title: string) {
  const section = screen.getByRole('heading', { name: title }).closest('section') as HTMLElement
  return within(section).getByRole('button', { name: 'Edit' })
}

describe('CheatsheetContent edit orchestration', () => {
  it('opens no editor initially', () => {
    renderSheet()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    ['Size', 'Edit size'],
    ['Position', 'Edit position'],
    ['Conditions', 'Edit conditions'],
    ['Edibility', 'Edit edibility'],
    ['More facts', 'Edit more facts'],
    ['Seasonal interest', 'Edit seasonal interest'],
    ['Care', 'Edit care jobs'],
  ])('the %s card Edit button opens the %s editor', async (title, dialogLabel) => {
    const user = userEvent.setup()
    renderSheet()
    await user.click(editIn(title))
    expect(screen.getByRole('dialog', { name: dialogLabel })).toBeInTheDocument()
  })

  it('the Calendar hero Edit button opens the calendar editor', async () => {
    const user = userEvent.setup()
    renderSheet()
    // The calendar hero tile has no heading; its Edit is first in document order (the masthead).
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    expect(screen.getByRole('dialog', { name: 'Edit calendar' })).toBeInTheDocument()
  })

  it('opens only one editor at a time and closes on Escape', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(editIn('Size'))
    expect(screen.getByRole('dialog', { name: 'Edit size' })).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // A different card opens its own editor, not the previous one.
    await user.click(editIn('Position'))
    expect(screen.getByRole('dialog', { name: 'Edit position' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Edit size' })).not.toBeInTheDocument()
  })
})
