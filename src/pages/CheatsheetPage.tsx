import { Link, useNavigate, useParams } from 'react-router-dom'
import { childrenOf, deleteNode, restoreNode } from '../app/editNode'
import { displayLabel } from '../lib/naming'
import { usePlantDetail, CheatsheetContent } from '../components/Cheatsheet'
import { Loading, NotFound } from '../components/Placeholders'
import { useToast } from '../hooks/useToast'

export default function CheatsheetPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const data = usePlantDetail(id)

  if (!data) return <Loading />
  if (!data.node) return <NotFound id={id} />

  const { node, ancestors, guides, tasks, neighbourhood } = data

  async function onDelete() {
    // Deleting a node with children leaves them parentless — a consequential call, so keep the
    // confirm there. A leaf delete is frictionless: just do it, with an Undo toast as the safety
    // net (restoring the row fully reverses the delete — children were never touched).
    const kids = await childrenOf(node.id)
    if (
      kids.length &&
      !window.confirm(
        `Delete "${displayLabel(node)}"? ${kids.length} plant(s) below it will be left without a parent.`,
      )
    ) {
      return
    }
    const snapshot = node
    await deleteNode(node.id)
    navigate('/')
    toast({
      message: `Deleted ${displayLabel(snapshot)}`,
      action: 'Undo',
      onAction: async () => {
        await restoreNode(snapshot)
        navigate(`/plant/${snapshot.id}`)
      },
    })
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
