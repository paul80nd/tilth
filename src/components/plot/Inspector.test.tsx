import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Bed } from '../../schema/userData'
import Inspector from './Inspector'

// The Inspector is a presentational shell; the only glue worth a dom test is the empty-state bed
// list — a full bed is hard to click on the plot, so it can be picked from here instead. The rest
// (bed/placement editing) is exercised by the garden feature tests below React.

const bed = (id: string, over: Partial<Bed> = {}): Bed =>
  ({ id, name: id, kind: 'bed', x: 0, y: 0, width: 1.2, height: 0.6, spacing: 'free', ...over })

// The mutation callbacks the Inspector needs but this suite doesn't drive.
const noops = {
  onBedChange: () => {},
  onRemoveBed: () => {},
  onQuantityChange: () => {},
  onPlacementShapeChange: () => {},
  onPlacementResize: () => {},
  onPlacementColorChange: () => {},
  onUnplace: () => {},
}

describe('Inspector — empty-state bed list', () => {
  it('lists every bed when nothing is selected', () => {
    render(<Inspector snapStep={0} beds={[bed('Raised bed 1'), bed('Border')]} {...noops} />)
    expect(screen.getByText('Select a bed or a planting to edit it. Nothing selected.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Raised bed 1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Border/ })).toBeInTheDocument()
  })

  it('lists beds alphabetically regardless of input order', () => {
    render(<Inspector snapStep={0} beds={[bed('Courgettes'), bed('Alliums'), bed('Beans')]} {...noops} />)
    const order = screen.getAllByRole('button').map((el) => el.textContent?.match(/^[A-Za-z ]+/)?.[0].trim())
    expect(order).toEqual(['Alliums', 'Beans', 'Courgettes'])
  })

  it('selects a bed when its row is clicked', async () => {
    const onSelectBed = vi.fn()
    const user = userEvent.setup()
    render(<Inspector snapStep={0} beds={[bed('Bed A'), bed('Bed B')]} onSelectBed={onSelectBed} {...noops} />)
    await user.click(screen.getByRole('button', { name: /Bed B/ }))
    expect(onSelectBed).toHaveBeenCalledExactlyOnceWith('Bed B')
  })

  it('marks a bed with a rotation warning', () => {
    render(<Inspector snapStep={0} beds={[bed('Bed A')]} warnBedIds={new Set(['Bed A'])} {...noops} />)
    expect(screen.getByRole('button', { name: /Bed A/ })).toHaveTextContent('⚠')
  })

  it('does not warn-mark a clean bed', () => {
    render(<Inspector snapStep={0} beds={[bed('Bed A')]} warnBedIds={new Set(['other'])} {...noops} />)
    expect(screen.getByRole('button', { name: /Bed A/ })).not.toHaveTextContent('⚠')
  })

  it('shows just the message when there are no beds', () => {
    render(<Inspector snapStep={0} beds={[]} {...noops} />)
    expect(screen.getByText(/Nothing selected/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('prefers the selected bed editor over the list', () => {
    // When a bed IS selected the list is gone and the bed editor shows (the "Beds" heading is the
    // list's; the editor uses a "Bed" heading + a Name field).
    render(<Inspector snapStep={0} bed={bed('Bed A')} beds={[bed('Bed A')]} {...noops} />)
    expect(screen.getByDisplayValue('Bed A')).toBeInTheDocument()
    expect(screen.queryByText('Select a bed or a planting to edit it. Nothing selected.')).not.toBeInTheDocument()
  })
})

describe('Inspector — companions', () => {
  it('shows good and bad pairings for the selected bed', () => {
    render(
      <Inspector
        snapStep={0}
        bed={bed('Veg bed')}
        companions={[
          { relation: 'good', a: 'Onion', b: 'Carrot', note: 'guard each other' },
          { relation: 'bad', a: 'Onion', b: 'Bean', note: 'alliums stunt legumes' },
        ]}
        {...noops}
      />,
    )
    expect(screen.getByText('Companions')).toBeInTheDocument()
    expect(screen.getByText(/✓ Onion \+ Carrot/)).toBeInTheDocument()
    expect(screen.getByText(/⚠ Onion \+ Bean/)).toBeInTheDocument()
  })

  it('omits the Companions section when there are none', () => {
    render(<Inspector snapStep={0} bed={bed('Empty bed')} companions={[]} {...noops} />)
    expect(screen.queryByText('Companions')).not.toBeInTheDocument()
  })
})
