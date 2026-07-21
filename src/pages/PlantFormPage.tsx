import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Category, PlantNode, Rank } from '../schema/plant'
import { listNodes } from '../app/plants'
import { createNode, updateNode } from '../app/editNode'
import { suggestId, hasIdentity } from '../lib/editNode'
import { displayLabel } from '../lib/naming'
import { EMPTY_FORM, fromNode, toPatch, toCreateFragment, type FormState } from '../lib/plantForm'

const RANKS: Rank[] = ['family', 'genus', 'species', 'cultivar', 'group']
const CATEGORIES: Category[] = ['flower', 'fruit', 'herb', 'tree', 'veg']

export default function PlantFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const nodes = useLiveQuery(listNodes, [], undefined as PlantNode[] | undefined)

  const existing = useMemo(
    () => (isEdit ? nodes?.find((n) => n.id === id) : undefined),
    [nodes, id, isEdit],
  )

  // Seed the form once the (edit) node is available; a plain useState initialiser can't wait
  // for the async node, so track whether we've hydrated and derive the initial state lazily.
  const [form, setForm] = useState(isEdit ? null : EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const state = form ?? (existing ? fromNode(existing) : null)

  if (nodes === undefined) return <p className="text-sm text-muted">Loading…</p>
  if (isEdit && !existing) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong bg-card p-8 text-center">
        <p className="text-sm text-muted">No plant found for "{id}".</p>
        <Link to="/" className="mt-2 inline-block text-sm font-medium text-brand-ink hover:underline">
          ← Back to Browse
        </Link>
      </div>
    )
  }
  if (!state) return <p className="text-sm text-muted">Loading…</p>

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm({ ...state, [key]: value })

  const patch = toPatch(state)
  const previewId = isEdit ? id! : suggestId(patch)
  const named = hasIdentity(patch)

  // Parent options: any node except the one being edited (a node can't be its own ancestor).
  const parentOptions = (nodes ?? [])
    .filter((n) => n.id !== id)
    .sort((a, b) => displayLabel(a).localeCompare(displayLabel(b)))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!state) return
    if (!hasIdentity(toPatch(state))) {
      setError('Add a common name or botanical name before saving.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      if (isEdit && existing) {
        await updateNode(existing, toPatch(state, existing))
        navigate(`/plant/${existing.id}`)
      } else {
        const fragment = toCreateFragment(state)
        await createNode(fragment)
        navigate(`/plant/${fragment.id}`)
      }
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-display font-semibold tracking-tight">
          {isEdit ? 'Edit plant' : 'Add plant'}
        </h1>
        <Link
          to={isEdit ? `/plant/${id}` : '/'}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-accent bg-accent-tint px-3 py-2 text-sm text-accent-ink">
          {error}
        </p>
      )}

      {/* Identity */}
      <Section title="Identity">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Common name">
            <Text value={state.commonName} onChange={(v) => set('commonName', v)} placeholder="Rhubarb" />
          </Field>
          <Field label="Variety">
            <Text value={state.variety} onChange={(v) => set('variety', v)} placeholder="Raspberry Red" />
          </Field>
          <Field label="Botanical name">
            <Text
              value={state.botanicalName}
              onChange={(v) => set('botanicalName', v)}
              placeholder="Rheum × hybridum"
            />
          </Field>
          <Field label="Category">
            <select
              value={state.category}
              onChange={(e) => set('category', e.target.value)}
              className={INPUT}
            >
              <option value="">— none —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Family">
            <Text value={state.family} onChange={(v) => set('family', v)} placeholder="Polygonaceae" />
          </Field>
          <Field label="Genus">
            <Text value={state.genus} onChange={(v) => set('genus', v)} placeholder="Rheum" />
          </Field>
          <Field label="Other names" hint="comma-separated">
            <Text value={state.otherNames} onChange={(v) => set('otherNames', v)} placeholder="Pie plant" />
          </Field>
          <Field label="Synonyms" hint="old botanical names, comma-separated">
            <Text value={state.synonyms} onChange={(v) => set('synonyms', v)} />
          </Field>
        </div>
      </Section>

      {/* Placement in the taxonomy */}
      <Section title="Placement">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Rank">
            <select value={state.rank} onChange={(e) => set('rank', e.target.value as Rank)} className={INPUT}>
              {RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Parent" hint="missing fields inherit from here">
            <select value={state.parentId} onChange={(e) => set('parentId', e.target.value)} className={INPUT}>
              <option value="">— none (top level) —</option>
              {parentOptions.map((n) => (
                <option key={n.id} value={n.id}>
                  {displayLabel(n)} ({n.rank})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-xs text-subtle">
          id: <code className="rounded bg-sunken px-1 py-0.5">{previewId || '—'}</code>
          {!isEdit && ' — generated from the name; change the name if it clashes'}
        </p>
      </Section>

      {/* Source links — the acquire worklist */}
      <Section title="Source links" hint="pages to enrich this plant from later">
        <div className="flex flex-col gap-2">
          {state.sourceLinks.map((link, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                value={link.source}
                onChange={(e) => {
                  const next = [...state.sourceLinks]
                  next[i] = { ...link, source: e.target.value }
                  set('sourceLinks', next)
                }}
                placeholder="source key (e.g. plant-db)"
                className={`${INPUT} w-32`}
              />
              <input
                value={link.url}
                onChange={(e) => {
                  const next = [...state.sourceLinks]
                  next[i] = { ...link, url: e.target.value }
                  set('sourceLinks', next)
                }}
                placeholder="https://…"
                className={`${INPUT} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={() => set('sourceLinks', state.sourceLinks.filter((_, j) => j !== i))}
                className="rounded-md px-2 py-1 text-sm text-muted hover:bg-sunken hover:text-ink"
                aria-label="Remove source link"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set('sourceLinks', [...state.sourceLinks, { source: '', url: '' }])}
            className="self-start rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            + Add source link
          </button>
        </div>
      </Section>

      {/* Notes + free facts */}
      <Section title="Notes & facts">
        <Field label="Notes">
          <textarea
            value={state.summary}
            onChange={(e) => set('summary', e.target.value)}
            rows={3}
            className={INPUT}
            placeholder="A short description or your own notes…"
          />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-subtle">Facts</span>
          {state.facts.map((fact, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                value={fact.key}
                onChange={(e) => {
                  const next = [...state.facts]
                  next[i] = { ...fact, key: e.target.value }
                  set('facts', next)
                }}
                placeholder="spacing"
                className={`${INPUT} w-40`}
              />
              <input
                value={fact.value}
                onChange={(e) => {
                  const next = [...state.facts]
                  next[i] = { ...fact, value: e.target.value }
                  set('facts', next)
                }}
                placeholder="30cm"
                className={`${INPUT} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={() => set('facts', state.facts.filter((_, j) => j !== i))}
                className="rounded-md px-2 py-1 text-sm text-muted hover:bg-sunken hover:text-ink"
                aria-label="Remove fact"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set('facts', [...state.facts, { key: '', value: '' }])}
            className="self-start rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            + Add fact
          </button>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !named}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-onbrand hover:opacity-90 disabled:opacity-50"
        >
          {isEdit ? 'Save changes' : 'Add plant'}
        </button>
        <Link
          to={isEdit ? `/plant/${id}` : '/'}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          Cancel
        </Link>
        {!named && (
          <span className="text-xs text-subtle">Add a common or botanical name to continue.</span>
        )}
      </div>
    </form>
  )
}

const INPUT =
  'w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-h3 font-semibold text-muted">{title}</h2>
        {hint && <span className="text-xs italic text-subtle">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline gap-1.5 text-xs font-medium uppercase tracking-wide text-subtle">
        {label}
        {hint && <span className="normal-case italic text-subtle/80">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function Text({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={INPUT}
    />
  )
}
