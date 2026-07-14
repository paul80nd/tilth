// Small labelled chip used across the cheatsheet (botanical/condition/fact chips). A `tone`
// picks a semantic token pair; default is a quiet neutral. Presentational only.
type Tone = 'neutral' | 'brand' | 'accent'

const TONES: Record<Tone, string> = {
  neutral: 'bg-sunken text-muted',
  brand: 'bg-brand-tint text-brand-ink',
  accent: 'bg-accent-tint text-accent-ink',
}

export default function Chip({
  children,
  tone = 'neutral',
  title,
}: {
  children: React.ReactNode
  tone?: Tone
  title?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
