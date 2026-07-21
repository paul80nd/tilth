// Pure form↔domain mapping for the hand-authored add/edit plant form (PlantFormPage). Keeping
// this out of the component makes it unit-testable and keeps the page a thin shell: the page owns
// the controlled inputs, these functions own the translation to/from a PlantNode. The rich fields
// (calendar, conditions, size, colour) aren't hand-entered here — they're left to the acquire step.
// Side-effect-free; the Dexie write goes through createNode/updateNode in src/app/editNode.

import type { Category, PlantNode, Rank, SourceLink } from '../schema/plant'
import type { NodeFragment } from './dataset'
import { suggestId } from './editNode'

/** Editable form state — the identity + placement + links + notes fields a gardener hand-enters.
 *  Multi-value fields are held as the raw text/rows the inputs bind to (comma lists as strings,
 *  links/facts as rows), collapsed to their node shape only in `toPatch`. */
export interface FormState {
  rank: Rank
  category: string
  commonName: string
  variety: string
  botanicalName: string
  family: string
  genus: string
  otherNames: string
  synonyms: string
  parentId: string
  summary: string
  sourceLinks: SourceLink[]
  facts: Array<{ key: string; value: string }>
}

/** A blank form (add mode) — a new node defaults to cultivar rank. */
export const EMPTY_FORM: FormState = {
  rank: 'cultivar',
  category: '',
  commonName: '',
  variety: '',
  botanicalName: '',
  family: '',
  genus: '',
  otherNames: '',
  synonyms: '',
  parentId: '',
  summary: '',
  sourceLinks: [],
  facts: [],
}

/** Hydrate the form from an existing node (edit mode). */
export function fromNode(node: PlantNode): FormState {
  return {
    rank: node.rank,
    category: node.category ?? '',
    commonName: node.commonName ?? '',
    variety: node.variety ?? '',
    botanicalName: node.botanicalName ?? '',
    family: node.family ?? '',
    genus: node.genus ?? '',
    otherNames: (node.otherNames ?? []).join(', '),
    synonyms: (node.synonyms ?? []).join(', '),
    parentId: node.parentId ?? '',
    summary: node.summary ?? '',
    sourceLinks: (node.sourceLinks ?? []).map((l) => ({ ...l })),
    facts: Object.entries(node.facts ?? {}).map(([key, value]) => ({ key, value })),
  }
}

const trimmed = (s: string): string | undefined => (s.trim() === '' ? undefined : s.trim())
const list = (s: string): string[] | undefined => {
  const items = s.split(',').map((x) => x.trim()).filter(Boolean)
  return items.length ? items : undefined
}

/** Turn form state into a patch of the fields it manages. `existing` (edit mode) lets an
 *  emptied array/map clear a previously-set value rather than churn one that was always empty. */
export function toPatch(form: FormState, existing?: PlantNode): Partial<PlantNode> {
  const links = form.sourceLinks
    .map((l) => ({ source: l.source.trim(), url: l.url.trim(), label: l.label?.trim() }))
    .filter((l) => l.url && l.source)
    .map((l) => (l.label ? l : { source: l.source, url: l.url }))
  const facts: Record<string, string> = {}
  for (const { key, value } of form.facts) {
    const k = key.trim()
    if (k) facts[k] = value.trim()
  }

  return {
    rank: form.rank,
    category: (trimmed(form.category) as Category) ?? undefined,
    commonName: trimmed(form.commonName),
    variety: trimmed(form.variety),
    botanicalName: trimmed(form.botanicalName),
    family: trimmed(form.family),
    genus: trimmed(form.genus),
    otherNames: list(form.otherNames),
    synonyms: list(form.synonyms),
    parentId: trimmed(form.parentId),
    summary: trimmed(form.summary),
    sourceLinks: links.length ? links : existing?.sourceLinks?.length ? [] : undefined,
    facts: Object.keys(facts).length ? facts : existing?.facts ? {} : undefined,
  }
}

/** Build the create fragment (add mode): a suggested id from the identity, plus every field the
 *  form actually set (undefined fields are dropped so the merge leaves them alone). */
export function toCreateFragment(form: FormState): NodeFragment {
  const patch = toPatch(form)
  const fragment: NodeFragment = { id: suggestId(patch) }
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) (fragment as Record<string, unknown>)[k] = v
  }
  return fragment
}
