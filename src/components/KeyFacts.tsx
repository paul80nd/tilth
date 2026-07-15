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
