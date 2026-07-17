import type { PlantNode } from '../schema/plant'
import { asLifecycle, lifecycleLabel } from './lifecycle'

/** A chip in the cheatsheet header's description block. `tone` maps to a Chip tone; `kind`
 *  names the field it came from (spreadsheet columns Type = lifecycle, Foliage, Habit). */
export interface NodeTag {
  label: string
  tone?: 'brand'
  kind: 'category' | 'rank' | 'lifecycle' | 'foliage' | 'habit'
}

/** The description tags shown in the cheatsheet header — category · rank · lifecycle(s) ·
 *  foliage · habit, in that order. The single source of truth shared by the cheatsheet header
 *  and the Taxonomy view's Tags column. Pass a *resolved* node (inherited fields filled in);
 *  `rank` is always the node's own structural rank, which resolution leaves untouched. */
export function nodeTags(node: PlantNode): NodeTag[] {
  const tags: NodeTag[] = []
  if (node.category) tags.push({ label: node.category, tone: 'brand', kind: 'category' })
  tags.push({ label: node.rank, kind: 'rank' })
  for (const c of asLifecycle(node.lifecycle) ?? []) tags.push({ label: lifecycleLabel(c), kind: 'lifecycle' })
  if (node.foliage) tags.push({ label: node.foliage, kind: 'foliage' })
  if (node.habit) tags.push({ label: node.habit, kind: 'habit' })
  return tags
}
