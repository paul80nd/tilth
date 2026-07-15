import type { Conditions, Size } from '../schema/plant'
import { Icon, type IconName } from './icons'

// The cheatsheet's key facts, grouped into small cards — Position, Size, Conditions (a row beneath
// the calendar) and Edibility (in the masonry). Each is an icon-led list of the same shape
// (icon · label · value) so the eye answers the same question in the same place for every plant.
// Presentation only — values come from the resolved node. An empty group shows a placeholder so
// its card holds its slot. The building blocks (Fact, FactList) are shared so these cards can grow
// more visual later without diverging.

/** "full-sun" → "Full sun". */
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
  tone = 'brand',
  children,
}: {
  icon: IconName
  label: string
  tone?: 'brand' | 'accent'
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 flex-none ${tone === 'accent' ? 'text-accent-ink' : 'text-brand-ink'}`}>
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <div className="text-[0.65rem] font-medium uppercase tracking-wide text-subtle">{label}</div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

type FactSpec = {
  key: string
  icon: IconName
  label: string
  value?: React.ReactNode
  tone?: 'brand' | 'accent'
}

/** A vertical list of the facts that have a value; a placeholder if none do. */
function FactList({ facts }: { facts: FactSpec[] }) {
  const shown = facts.filter((f) => f.value)
  if (shown.length === 0) return <p className="text-sm text-muted">Not recorded yet.</p>
  return (
    <div className="flex flex-col gap-3">
      {shown.map((f) => (
        <Fact key={f.key} icon={f.icon} label={f.label} tone={f.tone}>
          {f.value}
        </Fact>
      ))}
    </div>
  )
}

export function PositionFacts({ conditions }: { conditions?: Conditions }) {
  const c = conditions ?? {}
  return (
    <FactList
      facts={[
        { key: 'sun', icon: 'sun', label: 'Light', value: list(c.sun) },
        { key: 'aspect', icon: 'aspect', label: 'Aspect', value: aspectLabel(c.aspect) },
        { key: 'exposure', icon: 'exposure', label: 'Exposure', value: list(c.exposure) },
        {
          key: 'hardiness',
          icon: 'hardiness',
          label: 'Hardiness',
          value: c.hardiness ? <HardinessBadge rating={c.hardiness} /> : undefined,
        },
      ]}
    />
  )
}

export function SizeFacts({ size }: { size?: Size }) {
  const s = size ?? {}
  return (
    <FactList
      facts={[
        { key: 'time', icon: 'time', label: 'Time to maturity', value: s.timeToSize },
        { key: 'spread', icon: 'spread', label: 'Max spread', value: s.spread },
        { key: 'height', icon: 'height', label: 'Max height', value: s.height },
      ]}
    />
  )
}

export function EdibilityFacts({ edible, toxicity }: { edible?: string[]; toxicity?: string }) {
  return (
    <FactList
      facts={[
        { key: 'edible', icon: 'edible', label: 'Edible', value: list(edible) },
        { key: 'toxicity', icon: 'toxicity', label: 'Caution', value: toxicity, tone: 'accent' },
      ]}
    />
  )
}
