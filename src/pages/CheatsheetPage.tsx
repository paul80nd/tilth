import { Link, useNavigate, useParams } from 'react-router-dom'
import { childrenOf, deleteNode } from '../app/editNode'
import { displayLabel } from '../lib/naming'
import { usePlantDetail, CheatsheetContent } from '../components/Cheatsheet'
import { Loading, NotFound } from '../components/Placeholders'

export default function CheatsheetPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const data = usePlantDetail(id)

  if (!data) return <Loading />
  if (!data.node) return <NotFound id={id} />

  const { node, ancestors, guides, tasks, neighbourhood } = data

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

      <CheatsheetContent node={node} ancestors={ancestors} guides={guides} tasks={tasks} neighbourhood={neighbourhood} />
    </article>
  )
}
