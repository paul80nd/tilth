import { Link, useNavigate, useParams } from 'react-router-dom'
import { childrenOf, deleteNode } from '../app/editNode'
import { displayLabel } from '../lib/naming'
import { usePlantDetail, CheatsheetContent } from '../components/Cheatsheet'

export default function CheatsheetPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const data = usePlantDetail(id)

  if (!data) return <p className="text-sm text-muted">Loading…</p>
  if (!data.node) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong bg-card p-8 text-center">
        <p className="text-sm text-muted">No plant found for "{id}".</p>
        <Link to="/" className="mt-2 inline-block text-sm font-medium text-brand-ink hover:underline">
          ← Back to Browse
        </Link>
      </div>
    )
  }

  const { node, ancestors, guides, tasks } = data

  async function onDelete() {
    const kids = await childrenOf(node.id)
    const msg = kids.length
      ? `Delete "${displayLabel(node)}"? ${kids.length} plant(s) below it will be left without a parent.`
      : `Delete "${displayLabel(node)}"?`
    if (!window.confirm(msg)) return
    await deleteNode(node.id)
    navigate('/')
  }

  return (
    <article className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="text-sm font-medium text-muted hover:text-ink">
          ← Browse
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to={`/plant/${node.id}/edit`}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            Delete
          </button>
        </div>
      </div>

      <CheatsheetContent node={node} ancestors={ancestors} guides={guides} tasks={tasks} />
    </article>
  )
}
