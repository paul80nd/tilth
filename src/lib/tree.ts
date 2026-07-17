// Pure taxonomy-tree helpers for the compare view. Builds a forest from the flat node list,
// flattens it to the currently-visible rows given an expand set, and resolves inheritance for
// every node (so each row can show its own + inherited cheatsheet data). No I/O — unit-tested.

import type { PlantNode } from '../schema/plant'
import { resolveInherited, type ResolvedNode } from './taxonomy'

export interface TreeNode {
  node: PlantNode
  children: TreeNode[]
  depth: number
}

const sortKey = (n: PlantNode): string => (n.commonName ?? n.botanicalName ?? n.id).toLowerCase()

/**
 * Build a forest from flat nodes. A node roots when it has no parent (or its parent isn't in the
 * set — e.g. a floating cultivar). Siblings are ordered by display name; depth is recorded.
 */
export function buildForest(nodes: PlantNode[]): TreeNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const kids = new Map<string, PlantNode[]>()
  const roots: PlantNode[] = []
  for (const n of nodes) {
    const parent = n.parentId && byId.has(n.parentId) ? n.parentId : undefined
    if (parent) {
      const arr = kids.get(parent) ?? []
      arr.push(n)
      kids.set(parent, arr)
    } else {
      roots.push(n)
    }
  }
  const byName = (a: PlantNode, b: PlantNode) => sortKey(a).localeCompare(sortKey(b))
  const build = (n: PlantNode, depth: number): TreeNode => ({
    node: n,
    depth,
    children: (kids.get(n.id) ?? []).sort(byName).map((c) => build(c, depth + 1)),
  })
  return roots.sort(byName).map((n) => build(n, 0))
}

/** Depth-first list of the rows currently visible: a node's children show only when it's expanded. */
export function flattenVisible(forest: TreeNode[], expanded: Set<string>): TreeNode[] {
  const out: TreeNode[] = []
  const walk = (t: TreeNode) => {
    out.push(t)
    if (t.children.length && expanded.has(t.node.id)) t.children.forEach(walk)
  }
  forest.forEach(walk)
  return out
}

/** Every node's id (used to expand-all). */
export function allIds(forest: TreeNode[]): string[] {
  const out: string[] = []
  const walk = (t: TreeNode) => {
    out.push(t.node.id)
    t.children.forEach(walk)
  }
  forest.forEach(walk)
  return out
}

/**
 * Nearest ancestor (walking parentId) that carries its own `sourceLinks`, or null. Source
 * links are the per-node acquire worklist and deliberately NOT inherited — but a cultivar
 * whose species is linked is effectively "covered" (it enriches by inheritance), so callers
 * can surface that as a muted state rather than a missing-source gap.
 */
export function linkedAncestor(node: PlantNode, byId: Map<string, PlantNode>): PlantNode | null {
  const seen = new Set<string>([node.id])
  let cur = node.parentId ? byId.get(node.parentId) : undefined
  while (cur && !seen.has(cur.id)) {
    if (cur.sourceLinks?.length) return cur
    seen.add(cur.id)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }
  return null
}

/** Resolve inheritance for every node against its own ancestor chain, keyed by id. */
export function resolveAll(nodes: PlantNode[]): Map<string, ResolvedNode> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const ancestorsOf = (n: PlantNode): PlantNode[] => {
    const chain: PlantNode[] = []
    const seen = new Set<string>([n.id])
    let p = n.parentId ? byId.get(n.parentId) : undefined
    while (p && !seen.has(p.id)) {
      seen.add(p.id)
      chain.push(p)
      p = p.parentId ? byId.get(p.parentId) : undefined
    }
    return chain
  }
  const out = new Map<string, ResolvedNode>()
  for (const n of nodes) out.set(n.id, resolveInherited(n, ancestorsOf(n)))
  return out
}
