import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import type { PlantNode, Rank } from '../../src/schema/plant'
import { buildForest, flattenVisible, allIds, resolveAll } from '../../src/lib/tree'
import type { TreeNode } from '../../src/lib/tree'

const feature = await loadFeature('features/taxonomy.feature')

type Row = { id: string; rank: string; parentId: string; name: string }
let forest: TreeNode[]
let resolved: ReturnType<typeof resolveAll>

async function seed(rows: Row[]): Promise<void> {
  for (const r of rows) {
    const node: PlantNode = { id: r.id, rank: r.rank as Rank, commonName: r.name }
    if (r.parentId) node.parentId = r.parentId
    await db.nodes.put(node)
  }
}

async function build(): Promise<void> {
  const nodes = await db.nodes.toArray()
  forest = buildForest(nodes)
  resolved = resolveAll(nodes)
}

/** Depth-first flatten (all expanded) → the TreeNode for an id. */
function find(id: string): TreeNode | undefined {
  return flattenVisible(forest, new Set(allIds(forest))).find((t) => t.node.id === id)
}
function isDescendant(ancestorId: string, id: string): boolean {
  const walk = (t: TreeNode): boolean =>
    t.children.some((c) => c.node.id === id || walk(c))
  const anc = find(ancestorId)
  return !!anc && walk(anc)
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the store starts empty', async () => {
      await db.nodes.clear()
      expect(await db.nodes.count()).toBe(0)
    })
  })

  Scenario('Nodes nest into a family → genus → species → cultivar tree', ({ Given, When, Then, And }) => {
    Given('these nodes exist:', async (_, rows: Row[]) => {
      await seed(rows)
    })
    When('I build the taxonomy tree', async () => {
      await build()
    })
    Then('{string} is a descendant of {string}', (_, id: string, ancestor: string) => {
      expect(isDescendant(ancestor, id)).toBe(true)
    })
    And('{string} is at depth {int}', (_, id: string, depth: number) => {
      expect(find(id)?.depth).toBe(depth)
    })
  })

  Scenario('A cultivar\'s facets roll up from its ancestors', ({ Given, And, When, Then }) => {
    Given('these nodes exist:', async (_, rows: Row[]) => {
      await seed(rows)
    })
    And('node {string} has hardiness {string}', async (_, id: string, h: string) => {
      const n = (await db.nodes.get(id))!
      await db.nodes.put({ ...n, conditions: { ...n.conditions, hardiness: h } })
    })
    And('node {string} has category {string}', async (_, id: string, cat: string) => {
      const n = (await db.nodes.get(id))!
      await db.nodes.put({ ...n, category: cat as PlantNode['category'] })
    })
    When('I build the taxonomy tree', async () => {
      await build()
    })
    Then('the resolved node {string} has hardiness {string}', (_, id: string, h: string) => {
      expect(resolved.get(id)?.node.conditions?.hardiness).toBe(h)
    })
    And('the resolved node {string} has category {string}', (_, id: string, cat: string) => {
      expect(resolved.get(id)?.node.category).toBe(cat)
    })
  })
})
