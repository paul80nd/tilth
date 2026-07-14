import type { Conditions, Size } from '../schema/plant'
import { Icon, type IconName } from './icons'

// The cheatsheet's key-facts scan: a consistent, icon-led grid answering the same small set
// of questions in the same place for every plant (position, soil, moisture, pH, exposure,
// hardiness, and ultimate size). Presentation only — values come straight from the resolved
// node. Hardiness gets a distinct badge with a tooltip explaining the (generic) scale.

/** "full-sun" → "Full sun"; "well-drained" → "Well drained". */
function pretty(v: string): string {
  const s = v.replace(/-/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function list(values?: string[]): string | undefined {
  return values?.length ? values.map(pretty).join(', ') : undefined
}

/** ["south","west"] → "S / W facing". */
function aspectLabel(values?: string[]): string | undefined {
  if (!values?.length) return undefined
  return values.map((v) => v.charAt(0).toUpperCase()).join(' / ') + ' facing'
}

function HardinessBadge({ rating }: { rating: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md bg-brand-tint px-2 py-0.5 text-sm font-semibold text-brand-ink"
      title="Hardiness rating: lower numbers are more tender, higher numbers withstand colder winters (roughly H1 tender → H7 very hardy)."
    >
      {rating}
    </span>
  )
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: IconName
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex-none text-brand-ink">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <div className="text-[0.65rem] font-medium uppercase tracking-wide text-subtle">{label}</div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

export default function AtAGlance({
  conditions,
  size,
}: {
  conditions?: Conditions
  size?: Size
}) {
  const c = conditions ?? {}
  const s = size ?? {}

  const facts: React.ReactNode[] = []
  const push = (key: string, icon: IconName, label: string, value?: React.ReactNode) => {
    if (value) facts.push(<Fact key={key} icon={icon} label={label}>{value}</Fact>)
  }

  push('sun', 'sun', 'Position', list(c.sun))
  push('aspect', 'aspect', 'Aspect', aspectLabel(c.aspect))
  push('soil', 'soil', 'Soil', list(c.soil))
  push('moisture', 'moisture', 'Moisture', list(c.moisture))
  push('ph', 'ph', 'pH', list(c.ph))
  push('exposure', 'exposure', 'Exposure', list(c.exposure))
  push('hardiness', 'hardiness', 'Hardiness', c.hardiness ? <HardinessBadge rating={c.hardiness} /> : undefined)
  push('height', 'height', 'Height', s.height)
  push('spread', 'spread', 'Spread', s.spread)
  push('time', 'time', 'Time to size', s.timeToSize)

  if (facts.length === 0) return <p className="text-sm text-muted">Not recorded yet.</p>

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-lg border border-line bg-card p-4 sm:grid-cols-3">
      {facts}
    </div>
  )
}
