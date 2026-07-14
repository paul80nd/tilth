// Test data builders shared across feature steps and unit tests. Keep these the single
// source of a "valid node/guide/task" shape so tests stay readable. Nodes are deliberately
// MINIMAL (id + rank) — the merge model is about partial fragments, so most tests build up
// exactly the fields they care about rather than starting from a fat default.
import type { PlantNode, Guide, TaskTemplate } from '../src/schema/plant'
import type { Holding } from '../src/schema/userData'

/** A minimal valid node fragment; override any field per case. */
export function makeNode(over: Partial<PlantNode> & { id: string }): PlantNode {
  return { rank: 'cultivar', ...over }
}

export function makeGuide(over: Partial<Guide> & { id: string }): Guide {
  return { title: `Guide ${over.id}`, kind: 'general', ...over }
}

export function makeTask(over: Partial<TaskTemplate> & { id: string }): TaskTemplate {
  return { action: `Do ${over.id}`, months: [], ...over }
}

export function makeHolding(over: Partial<Holding> & { id: string; nodeId: string }): Holding {
  return { status: 'growing', ...over }
}
