// Placeholder for "My garden" — the holdings view (what you're actually growing, plus the
// currently-growing vs grown-before distinction). Arrives with the Holdings step; kept as a
// signposted stub so the nav structure is real now.
export default function GardenPage() {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-dashed border-line-strong bg-card p-8 text-center">
      <h2 className="font-display text-h2 font-semibold">My garden</h2>
      <p className="mt-2 text-sm text-muted">
        This is where the plants you actually grow will live — with the currently-growing vs
        grown-before filter. It arrives with holdings. For now, explore the full record under{' '}
        <span className="font-medium text-ink">Browse</span>.
      </p>
    </div>
  )
}
