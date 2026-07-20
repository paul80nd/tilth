import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listDoneKeys, listJobs, toggleJobDone } from '../app/jobs'
import { groupJobsByPlant, jobDoneKey, type Job, type PlantJobs } from '../lib/jobs'
import { MONTH_NAMES } from '../lib/calendar'
import { CATEGORY_COLOR, DEFAULT_CATEGORY_COLOR } from '../lib/plantColor'
import { CheatsheetModal } from '../components/CheatsheetModal'

const NOW = new Date()
const CURRENT_MONTH = NOW.getMonth() + 1
// The period a "done" tick is scoped to — this specific month occurrence (YYYY-MM).
const PERIOD = `${NOW.getFullYear()}-${String(CURRENT_MONTH).padStart(2, '0')}`

// The whole-garden maintenance list: every held plant's jobs, rolled up + de-duplicated, laid
// out by month and grouped plant-first. Within a bucket, jobs split into one-off "To do" (a
// discrete task you tick off) and "Ongoing care" (continuous reminders — water, weed, deadhead —
// that a tick wouldn't mean anything for). This month is pinned + open and its one-offs are
// tickable (a persisted, reversible strike scoped to this month); the rest of the year and the
// "Anytime" jobs are collapsed, reference-only. Growing-only (see docs/jobs-page-spec.md).
export default function JobsPage() {
  const calendar = useLiveQuery(() => listJobs(), [])
  const doneKeys = useLiveQuery(() => listDoneKeys(PERIOD), [])
  const [openId, setOpenId] = useState<string | null>(null)

  if (!calendar) return <p className="text-sm text-muted">Loading…</p>

  const thisMonth = calendar.months[CURRENT_MONTH - 1]
  const otherMonths = calendar.months.filter((m) => m.month !== CURRENT_MONTH)

  const isDone = (subjectId: string, action: string) =>
    doneKeys?.has(jobDoneKey(PERIOD, subjectId, action)) ?? false
  const toggle = (subjectId: string, action: string) => toggleJobDone(PERIOD, subjectId, action)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display font-semibold tracking-tight">Jobs</h1>
        <p className="text-sm text-muted">
          Maintenance for the plants you grow, month by month — the tasks you'd otherwise forget.
        </p>
      </div>

      {/* This month — pinned, always open; one-offs are tickable */}
      <section className="rounded-xl border border-brand-tint bg-brand-tint/30 p-4">
        <h2 className="mb-3 font-display text-h2 font-semibold">
          This month — {MONTH_NAMES[CURRENT_MONTH - 1]}
        </h2>
        <BucketBody jobs={thisMonth.jobs} onOpen={setOpenId} isDone={isDone} onToggle={toggle} tickable />
      </section>

      {/* The rest of the year (Jan→Dec) + Anytime — collapsed, reference-only disclosures */}
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
  const count = jobs.length ? groupJobsByPlant(jobs).reduce((n, p) => n + p.actions.length, 0) : 0
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
        <BucketBody jobs={jobs} onOpen={onOpen} />
      </div>
    </details>
  )
}

/** A bucket's jobs, split into one-off "To do" (tickable when `tickable`) and "Ongoing care".
 *  The two subheadings only show when both kinds are present, so an all-ongoing month stays a
 *  plain list. A quiet note when empty. */
function BucketBody({
  jobs,
  onOpen,
  isDone,
  onToggle,
  tickable,
}: {
  jobs: Job[]
  onOpen: (id: string) => void
  isDone?: (subjectId: string, action: string) => boolean
  onToggle?: (subjectId: string, action: string) => void
  tickable?: boolean
}) {
  if (jobs.length === 0) return <p className="text-sm text-subtle">Nothing to do.</p>
  const once = jobs.filter((j) => j.cadence === 'once')
  const ongoing = jobs.filter((j) => j.cadence !== 'once')
  const both = once.length > 0 && ongoing.length > 0
  return (
    <div className="flex flex-col gap-4">
      {once.length > 0 && (
        <CadenceGroup
          label="To do"
          showLabel={both}
          jobs={once}
          onOpen={onOpen}
          isDone={tickable ? isDone : undefined}
          onToggle={tickable ? onToggle : undefined}
        />
      )}
      {ongoing.length > 0 && <CadenceGroup label="Ongoing care" showLabel={both} jobs={ongoing} onOpen={onOpen} />}
    </div>
  )
}

/** One cadence group: an optional subheading over its plant rows. */
function CadenceGroup({
  label,
  showLabel,
  jobs,
  onOpen,
  isDone,
  onToggle,
}: {
  label: string
  showLabel: boolean
  jobs: Job[]
  onOpen: (id: string) => void
  isDone?: (subjectId: string, action: string) => boolean
  onToggle?: (subjectId: string, action: string) => void
}) {
  return (
    <div>
      {showLabel && (
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-subtle">{label}</p>
      )}
      <PlantRows jobs={jobs} onOpen={onOpen} isDone={isDone} onToggle={onToggle} />
    </div>
  )
}

/** Plant-first rows for a set of jobs — multi-column masonry on wide screens. Actions are
 *  tickable when `onToggle` is supplied (the one-off "To do" list this month). */
function PlantRows({
  jobs,
  onOpen,
  isDone,
  onToggle,
}: {
  jobs: Job[]
  onOpen: (id: string) => void
  isDone?: (subjectId: string, action: string) => boolean
  onToggle?: (subjectId: string, action: string) => void
}) {
  const plants = groupJobsByPlant(jobs)
  return (
    <ul className="columns-1 gap-x-10 lg:columns-2">
      {plants.map((p) => (
        <PlantRow key={p.subjectId} plant={p} onOpen={onOpen} isDone={isDone} onToggle={onToggle} />
      ))}
    </ul>
  )
}

/** One plant and the actions it needs this bucket — a single scannable line. The plant name
 *  opens its cheatsheet (the full how-to); each action carries its note as a hover tooltip and,
 *  when tickable, toggles a strikethrough "done" on click. */
function PlantRow({
  plant,
  onOpen,
  isDone,
  onToggle,
}: {
  plant: PlantJobs
  onOpen: (id: string) => void
  isDone?: (subjectId: string, action: string) => boolean
  onToggle?: (subjectId: string, action: string) => void
}) {
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
          {plant.actions.map((a, i) => {
            const done = isDone?.(plant.subjectId, a.action) ?? false
            return (
              <span key={a.action}>
                {i > 0 && <span className="text-subtle"> · </span>}
                {onToggle ? (
                  <button
                    type="button"
                    onClick={() => onToggle(plant.subjectId, a.action)}
                    aria-pressed={done}
                    title={a.note}
                    className={[
                      'cursor-pointer text-left',
                      done ? 'text-subtle line-through' : 'hover:text-ink',
                    ].join(' ')}
                  >
                    {a.action}
                  </button>
                ) : (
                  <span title={a.note} className={a.note ? 'cursor-help' : undefined}>
                    {a.action}
                  </span>
                )}
              </span>
            )
          })}
        </span>
      </span>
    </li>
  )
}
