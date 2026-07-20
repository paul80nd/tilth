import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listJobs } from '../app/jobs'
import { groupJobs, type Job, type JobActionGroup } from '../lib/jobs'
import { MONTH_NAMES } from '../lib/calendar'
import { CATEGORY_COLOR, DEFAULT_CATEGORY_COLOR } from '../lib/plantColor'
import { CheatsheetModal } from '../components/CheatsheetModal'

const CURRENT_MONTH = new Date().getMonth() + 1

// The whole-garden maintenance list: every held plant's jobs, rolled up + de-duplicated, laid
// out by month. This month is pinned + open at the top; the rest of the year (and the
// condition-based "Anytime" jobs) are collapsed disclosures below. Display-only, growing-only
// (see docs/jobs-page-spec.md).
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
        <JobGroups jobs={thisMonth.jobs} onOpen={setOpenId} />
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
  const groups = jobs.length ? groupJobs(jobs) : []
  const count = groups.reduce((n, g) => n + g.rows.length, 0)
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
        <JobGroups jobs={jobs} groups={groups} onOpen={onOpen} />
      </div>
    </details>
  )
}

/** A bucket's jobs grouped by action — or a quiet empty note. Pass `groups` to reuse a
 *  pre-computed grouping (the disclosures do, for the tab count), else it groups `jobs`. */
function JobGroups({
  jobs,
  groups,
  onOpen,
}: {
  jobs: Job[]
  groups?: JobActionGroup[]
  onOpen: (id: string) => void
}) {
  if (jobs.length === 0) return <p className="text-sm text-subtle">Nothing to do.</p>
  const resolved = groups ?? groupJobs(jobs)
  // Multi-column masonry on wide screens: groups flow into two columns, each kept whole.
  return (
    <ul className="columns-1 gap-x-10 lg:columns-2">
      {resolved.map((g) => (
        <ActionGroup key={g.action} group={g} onOpen={onOpen} />
      ))}
    </ul>
  )
}

/** One action (the general task) and its rows — each row a distinct job listing its crops,
 *  with the note demoted to a quiet line beneath. */
function ActionGroup({ group, onOpen }: { group: JobActionGroup; onOpen: (id: string) => void }) {
  return (
    <li className="mb-5 break-inside-avoid">
      <p className="text-sm font-semibold">{group.action}</p>
      <ul className="mt-1.5 flex flex-col gap-2">
        {group.rows.map((row, i) => (
          <li key={i}>
            <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm">
              {row.subjects.map((s, j) => (
                <span key={s.id} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLOR[s.category ?? ''] ?? DEFAULT_CATEGORY_COLOR }}
                  />
                  <button
                    type="button"
                    onClick={() => onOpen(s.id)}
                    className="font-medium text-ink hover:text-brand-ink hover:underline"
                  >
                    {s.name}
                  </button>
                  {j < row.subjects.length - 1 && <span className="text-subtle">,</span>}
                </span>
              ))}
            </span>
            {row.note && <p className="mt-0.5 max-w-prose pl-3.5 text-xs text-muted">{row.note}</p>}
          </li>
        ))}
      </ul>
    </li>
  )
}
