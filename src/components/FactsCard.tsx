// The "More facts" card body: free key/value facts as chips, with an empty-state line. Shared by
// the cheatsheet tile and the Facts editor's live preview so the two never drift (mirrors how the
// other editors preview their real card).
export function FactsCard({ facts }: { facts: Record<string, string> }) {
  const entries = Object.entries(facts)
  if (entries.length === 0) return <p className="text-sm text-muted">None recorded yet.</p>
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span key={key} className="inline-flex items-baseline gap-1.5 rounded-md bg-sunken px-2.5 py-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-subtle">{key}</span>
          <span className="font-medium">{value}</span>
        </span>
      ))}
    </div>
  )
}
