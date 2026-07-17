import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildReview, applyReview, type ImportReview } from '../app/importReview'
import type { ImportResult } from '../app/dataset'
import type { FieldChange } from '../lib/importDiff'

// Diff-review import: paste / drop a source fragment, see per-field what it would change, untick
// anything, and apply only the ticked parts. The heavy lifting is in src/app/importReview.ts;
// this is the shell. Unchanged fields are hidden (a re-import is mostly no-ops) behind a count.

type Selection = { nodes: Record<string, Set<string>>; guides: Set<string>; tasks: Set<string> }

/** Compact one-line rendering of a stored/incoming value for the diff table. */
function fmt(v: unknown): string {
  if (v === undefined || v === null) return '—'
  if (Array.isArray(v)) {
    return v.every((x) => typeof x === 'string' || typeof x === 'number') ? v.join(', ') : JSON.stringify(v)
  }
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export default function ImportPanel() {
  const [text, setText] = useState('')
  const [review, setReview] = useState<ImportReview | null>(null)
  const [sel, setSel] = useState<Selection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ res: ImportResult; ids: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function preview(source?: string) {
    setError(null)
    setResult(null)
    setReview(null)
    setSel(null)
    const src = (source ?? text).trim()
    if (!src) {
      setError('Paste or drop a fragment first.')
      return
    }
    try {
      const r = await buildReview(src)
      if (r.nodes.length === 0 && r.guides.length === 0 && r.tasks.length === 0) {
        setError(r.errors[0] ?? 'Nothing importable in that fragment.')
        return
      }
      setReview(r)
      const nodes: Record<string, Set<string>> = {}
      for (const n of r.nodes) nodes[n.id] = new Set(n.changes.filter((c) => c.status !== 'same').map((c) => c.field))
      setSel({ nodes, guides: new Set(r.guides.map((g) => g.id)), tasks: new Set(r.tasks.map((t) => t.id)) })
    } catch (err) {
      setError(`Couldn't read that fragment: ${(err as Error).message}`)
    }
  }

  function loadFile(file: File | undefined) {
    if (!file) return
    file.text().then((t) => {
      setText(t)
      void preview(t)
    })
  }

  async function apply() {
    if (!review || !sel) return
    setError(null)
    try {
      const nodeFields: Record<string, string[]> = {}
      for (const [id, fields] of Object.entries(sel.nodes)) if (fields.size) nodeFields[id] = [...fields]
      const res = await applyReview(review, { nodeFields, guideIds: [...sel.guides], taskIds: [...sel.tasks] })
      setResult({ res, ids: Object.keys(nodeFields) })
      setReview(null)
      setSel(null)
      setText('')
    } catch (err) {
      setError(`Import failed: ${(err as Error).message}`)
    }
  }

  function toggleField(id: string, field: string) {
    setSel((s) => {
      if (!s) return s
      const set = new Set(s.nodes[id])
      set.has(field) ? set.delete(field) : set.add(field)
      return { ...s, nodes: { ...s.nodes, [id]: set } }
    })
  }

  function setAll(id: string, fields: string[], on: boolean) {
    setSel((s) => (s ? { ...s, nodes: { ...s.nodes, [id]: new Set(on ? fields : []) } } : s))
  }

  function toggleRecord(kind: 'guides' | 'tasks', recId: string) {
    setSel((s) => {
      if (!s) return s
      const set = new Set(s[kind])
      set.has(recId) ? set.delete(recId) : set.add(recId)
      return { ...s, [kind]: set }
    })
  }

  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <h2 className="font-display text-h3 font-semibold">Import</h2>
      <p className="mt-1 text-sm text-muted">
        Paste or drop a source <span className="font-medium text-ink">fragment</span> (the JSON an
        acquire produces). You'll see, field by field, what it would change — untick anything you
        don't want, then apply.
      </p>

      {/* Paste / drop / pick — all feed the same textarea */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          loadFile(e.dataTransfer.files?.[0])
        }}
        className={`mt-3 rounded-md border border-dashed p-2 ${dragOver ? 'border-brand bg-brand-tint' : 'border-line-strong'}`}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          spellCheck={false}
          placeholder="Paste fragment JSON here, or drop a .json file…"
          className="w-full resize-y bg-transparent p-2 font-mono text-xs text-ink outline-none placeholder:text-subtle"
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          loadFile(e.target.files?.[0])
          e.target.value = ''
        }}
        className="hidden"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void preview()}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-onbrand hover:opacity-90"
        >
          Preview changes
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
        >
          Choose file…
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-accent bg-accent-tint p-3 text-sm text-accent-ink">{error}</div>
      )}

      {result && (
        <div className="mt-3 rounded-md border border-line bg-brand-tint p-3 text-sm text-brand-ink">
          Imported into <span className="font-semibold">{result.res.nodes}</span>{' '}
          {result.res.nodes === 1 ? 'plant' : 'plants'}
          {result.res.guides + result.res.tasks > 0 &&
            ` (+${result.res.guides + result.res.tasks} guide/task)`}
          .{' '}
          {result.ids.slice(0, 8).map((id) => (
            <Link key={id} to={`/plant/${id}`} className="mr-2 font-medium underline">
              {id}
            </Link>
          ))}
          {result.ids.length > 8 && <span>and {result.ids.length - 8} more.</span>}
        </div>
      )}

      {review && sel && (
        <div className="mt-4 flex flex-col gap-4">
          {review.nodes.map((n) => {
            const shown = n.changes.filter((c) => c.status !== 'same')
            const sameCount = n.changes.length - shown.length
            const ticked = sel.nodes[n.id]
            return (
              <div key={n.id} className="rounded-md border border-line">
                <div className="flex items-center justify-between gap-2 border-b border-divider px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-ink">{n.id}</span>
                    {n.isNew && (
                      <span className="rounded bg-brand-tint px-1.5 py-0.5 text-xs font-semibold text-brand-ink">
                        new
                      </span>
                    )}
                  </div>
                  {shown.length > 0 && (
                    <div className="flex gap-2 text-xs">
                      <button type="button" onClick={() => setAll(n.id, shown.map((c) => c.field), true)} className="text-brand-ink hover:underline">
                        All
                      </button>
                      <button type="button" onClick={() => setAll(n.id, [], false)} className="text-muted hover:underline">
                        None
                      </button>
                    </div>
                  )}
                </div>

                {shown.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-subtle">No changes — everything here matches.</p>
                ) : (
                  <ul className="divide-y divide-divider">
                    {shown.map((c: FieldChange) => (
                      <li key={c.field} className="flex items-start gap-3 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={ticked.has(c.field)}
                          onChange={() => toggleField(n.id, c.field)}
                          className="mt-0.5 accent-brand"
                          aria-label={`Apply ${c.field}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-ink">{c.field}</span>
                            <span
                              className={`rounded px-1 py-0.5 text-[0.6rem] font-semibold uppercase ${
                                c.status === 'new' ? 'bg-brand-tint text-brand-ink' : 'bg-accent-tint text-accent-ink'
                              }`}
                            >
                              {c.status}
                            </span>
                          </div>
                          <div className="mt-0.5 break-words text-xs text-muted">
                            {c.status === 'changed' && (
                              <>
                                <span className="text-subtle line-through">{fmt(c.existing)}</span>
                                <span className="mx-1 text-subtle">→</span>
                              </>
                            )}
                            <span className="text-ink">{fmt(c.incoming)}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {sameCount > 0 && (
                  <p className="border-t border-divider px-3 py-1.5 text-[0.7rem] text-subtle">
                    {sameCount} unchanged {sameCount === 1 ? 'field' : 'fields'} hidden
                  </p>
                )}
              </div>
            )
          })}

          {(review.guides.length > 0 || review.tasks.length > 0) && (
            <div className="rounded-md border border-line">
              <div className="border-b border-divider px-3 py-2 text-sm font-semibold text-ink">Guides &amp; tasks</div>
              <ul className="divide-y divide-divider">
                {review.guides.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                    <input type="checkbox" checked={sel.guides.has(g.id)} onChange={() => toggleRecord('guides', g.id)} className="accent-brand" />
                    <span className="text-ink">{g.label}</span>
                    <span className="text-subtle">{g.isNew ? 'new guide' : 'update guide'}</span>
                  </li>
                ))}
                {review.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                    <input type="checkbox" checked={sel.tasks.has(t.id)} onChange={() => toggleRecord('tasks', t.id)} className="accent-brand" />
                    <span className="text-ink">{t.label}</span>
                    <span className="text-subtle">{t.isNew ? 'new task' : 'update task'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <button type="button" onClick={() => void apply()} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-onbrand hover:opacity-90">
              Apply selected
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
