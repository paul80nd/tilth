import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listJobs } from '../app/jobs'
import { groupJobsByPlant, type Job, type PlantJobs } from '../lib/jobs'
import { MONTH_NAMES } from '../lib/calendar'
import { CATEGORY_COLOR, DEFAULT_CATEGORY_COLOR } from '../lib/plantColor'
import { CheatsheetModal } from '../components/CheatsheetModal'

const CURRENT_MONTH = new Date().getMonth() + 1

// The whole-garden maintenance list: every held plant's jobs, rolled up + de-duplicated, laid
// out by month and grouped plant-first (one row per plant listing what it needs). This month is
// pinned + open at the top; the rest of the year (and the condition-based "Anytime" jobs) are
// collapsed disclosures below. Notes ride on hover; the plant's cheatsheet holds the full how-to.
// Display-only, growing-only (see docs/jobs-page-spec.md).
export default function JobsPage() {
  const calendar = useLiveQuery(() => listJobs(), [])
  const [openId, setOpenId] = useState<string | null>(null)

  if (!calendar) return <p className="text-sm text-muted">Loading…</p>

  const thisMonth = calendar.months[CURRENT_MONTH - 1]
  const otherMonths = calendar.months.filter((m) => m.month !== CURRENT_MONTH)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display font-semibold tracking-tight">Jobs</h1>
        <p className="text-sm text-muted">
          Maintenance for the plants you grow, month by month — the tasks you'd otherwise forget.
        </p>
      </div>

      {/* This month — pinned, always open */}
      <section className="rounded-xl border border-brand-tint bg-brand-tint/30 p-4">
        <h2 className="mb-3 font-display text-h2 font-semibold">
          This month — {MONTH_NAMES[CURRENT_MONTH - 1]}
        </h2>
        <PlantRows jobs={thisMonth.jobs} onOpen={setOpenId} />
      </section>

      {/* The rest of the year (Jan→Dec) + Anytime — collapsed disclosures */}
      <section className="flex flex-col">
        {otherMonths.map((m) => (
          <MonthSection key={m.month} name={m.name} jobs={m.jobs} onOpen={setOpenId} />
        ))}
        <MonthSection name="Anytime" jobs={calendar.anytime} onOpen={setOpenId} />
      </section>

      {openId && <CheatsheetModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

/** A collapsible month (or Anytime) block — collapsed by default, with a job count on the tab. */
function MonthSection({ name, jobs, onOpen }: { name: string; jobs: Job[]; onOpen: (id: string) => void }) {
  const plants = jobs.length ? groupJobsByPlant(jobs) : []
  const count = plants.reduce((n, p) => n + p.actions.length, 0)
  return (
    <details className="group border-b border-line last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-3">
        <span className="text-xs text-subtle transition-transform group-open:rotate-90">▶</span>
        <span className="font-display text-h2 font-semibold">{name}</span>
        <span className="ml-1 text-xs text-subtle">
          {count === 0 ? 'nothing to do' : `${count} ${count === 1 ? 'job' : 'jobs'}`}
        </span>
      </summary>
      <div className="pb-4 pl-6">
        <PlantRows jobs={jobs} plants={plants} onOpen={onOpen} />
      </div>
    </details>
  )
}

/** A bucket's jobs grouped plant-first — or a quiet empty note. Pass `plants` to reuse a
 *  pre-computed grouping (the disclosures do, for the tab count), else it groups `jobs`. */
function PlantRows({
  jobs,
  plants,
  onOpen,
}: {
  jobs: Job[]
  plants?: PlantJobs[]
  onOpen: (id: string) => void
}) {
  if (jobs.length === 0) return <p className="text-sm text-subtle">Nothing to do.</p>
  const resolved = plants ?? groupJobsByPlant(jobs)
  // Multi-column masonry on wide screens: plant rows flow into two columns, each kept whole.
  return (
    <ul className="columns-1 gap-x-10 lg:columns-2">
      {resolved.map((p) => (
        <PlantRow key={p.subjectId} plant={p} onOpen={onOpen} />
      ))}
    </ul>
  )
}

/** One plant and the actions it needs this bucket — a single scannable line. The plant name
 *  opens its cheatsheet (the full how-to); each action carries its note as a hover tooltip. */
function PlantRow({ plant, onOpen }: { plant: PlantJobs; onOpen: (id: string) => void }) {
  return (
    <li className="mb-2.5 flex break-inside-avoid items-baseline gap-2 text-sm">
      <span
        aria-hidden
        className="mt-1.5 inline-block size-2 shrink-0 rounded-full"
        style={{ backgroundColor: CATEGORY_COLOR[plant.category ?? ''] ?? DEFAULT_CATEGORY_COLOR }}
      />
      <span className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(plant.subjectId)}
          className="font-medium text-ink hover:text-brand-ink hover:underline"
        >
          {plant.subjectName}
        </button>
        <span className="ml-2 text-muted">
          {plant.actions.map((a, i) => (
            <span key={a.action} title={a.note} className={a.note ? 'cursor-help' : undefined}>
              {i > 0 && <span className="text-subtle"> · </span>}
              {a.action}
            </span>
          ))}
        </span>
      </span>
    </li>
  )
}
