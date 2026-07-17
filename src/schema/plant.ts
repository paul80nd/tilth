// The generic, provider-neutral plant schema — Tilth's public storage format.
// Private adapters map any source (a horticultural database, a seed-packet page) onto
// these shapes; the app only ever sees this. Keep it source-agnostic: nothing here
// should name or assume a particular provider.
//
// Two ideas make this schema unlike a flat recipe list:
//   1. HIERARCHY — a plant record can sit at any botanical rank (family → genus →
//      species → cultivar) and links "up" to its parent. Guidance and jobs attach at a
//      rank and aggregate down to the specific things you grow.
//   2. MERGE + PROVENANCE — a record is filled from several sources over time (botanical
//      facts from one, sowing depths from a seed packet). An import fragment carries only
//      *some* fields; present ⇒ overwrite, absent ⇒ leave alone. Every top-level field
//      remembers which source last set it (`provenance`), so a later import can reason
//      about who wins. See docs/spec.md + docs/decisions.md.

/** Botanical rank a node occupies. Holdings usually point at `cultivar` (or `species`
 *  when the variety is unknown); guidance/jobs may attach at any level and aggregate
 *  down. `group` covers informal horticultural groupings (e.g. "fruit trees"). */
export type Rank = 'family' | 'genus' | 'species' | 'cultivar' | 'group'

/** Top-level growing category — the sheet's first column. A browse facet AND a driver of
 *  default job templates (veg → rotation/harvest, fruit tree → prune/thin, …). Extensible. */
export type Category = 'flower' | 'fruit' | 'herb' | 'tree' | 'veg'

/** How long a plant takes to run germinate → flower → seed → die. MULTI-VALUED because this
 *  isn't fixed — it varies with climate, sowing time and how a plant is grown, so a source
 *  legitimately asserts more than one (a tender perennial *grown as* an annual; a short-lived
 *  perennial that also behaves biennial). A single value is just a one-element set. */
export type LifecycleCode = 'annual' | 'biennial' | 'perennial'

/** Where a single field's current value came from. Stamped per top-level field at merge
 *  time so provenance is inspectable and a later source can be preferred deliberately. */
export interface FieldSource {
  /** Opaque source key (e.g. "plant-db", "seed-packet"). Provider-neutral; never a URL or
   *  brand in committed data — the mapping to a real source lives in the private layer. */
  source: string
  /** Deep link back to the page this value was read from. Private datasets only. */
  url?: string
  /** ISO date the value was imported. */
  importedAt?: string
}

/** A user-declared page to enrich a plant from — pasted when adding/editing a plant, and
 *  read back by the acquire step (out of the exported backup) as its lookup list. `source`
 *  is the opaque provenance key the acquire will stamp on the fields it fills (e.g. "plant-db");
 *  `url` is the page; `label` is an optional human note. Distinct from `FieldSource.url`,
 *  which records where a *value* came from after an acquire. User data — a real URL here is
 *  fine (it lives in IndexedDB / the exported backup, never committed); committed demo data
 *  uses `example.invalid`. */
export interface SourceLink {
  source: string
  url: string
  label?: string
}

/** A phase in the 12-month calendar. Stored as a source-neutral shortcode; the UI maps
 *  the code to a colour + label + legend (seed brands colour these differently, so colour
 *  is never stored). "Actionable" codes (sow*, plant-out, pot-on, prune, thin, harvest,
 *  feed, divide) also feed the jobs engine; "state" codes (flower, foliage, fruit, stem) are
 *  display-only. See docs/spec.md § Calendar. */
export type PhaseCode =
  | 'sow-indoors'
  | 'sow-outdoors'
  | 'pot-on'
  | 'plant-out'
  | 'prune'
  | 'thin'
  | 'divide'
  | 'feed'
  | 'harvest'
  | 'flower'
  | 'foliage'
  | 'fruit'
  | 'stem'

/** One phase over a set of months (1 = Jan … 12 = Dec). Contiguous or not. */
export interface PhaseSpan {
  code: PhaseCode
  months: number[]
  /** Optional free note shown on the phase (e.g. "under glass", "every 2–3 weeks"). */
  note?: string
  /** For STATE codes (flower/foliage/fruit): the real ornamental colour in *these* months —
   *  e.g. foliage "green" in summer but "yellow" in autumn (two spans). This is genuine
   *  botanical data, distinct from the fixed legend colour of action codes; the UI maps known
   *  colour words to a swatch (lib/colour). Lets colour vary through the year. */
  colour?: string
}

/** Soil / position facets, kept as small closed vocabularies so the cheatsheet can render
 *  them as compact iconography (like the spreadsheet). All optional — a node only carries
 *  what a source has supplied. */
export interface Conditions {
  /** Suitable soil textures. */
  soil?: Array<'chalk' | 'clay' | 'loam' | 'sand'>
  moisture?: Array<'well-drained' | 'moist' | 'poorly-drained'>
  ph?: Array<'acid' | 'neutral' | 'alkaline'>
  sun?: Array<'full-sun' | 'partial-shade' | 'full-shade'>
  /** Compass aspect the position faces — distinct from `sun` (how much light) and `exposure`
   *  (shelter). Rendered as e.g. "S / W facing". */
  aspect?: Array<'north' | 'east' | 'south' | 'west'>
  exposure?: Array<'sheltered' | 'exposed'>
  /** Hardiness rating, e.g. "H5". Kept as a string to preserve the source's scale. */
  hardiness?: string
}

/** Ultimate size. Ranges arrive as text on the source ("0.1–0.5m") so kept as strings. */
export interface Size {
  height?: string
  spread?: string
  /** Time to ultimate size, e.g. "2–5 years". */
  timeToSize?: string
}

/** A reference plant node — the merge-imported record behind the cheatsheet one-pager.
 *  Every field except `id`/`rank` is optional: a node accretes detail from many imports.
 *  Arrays and nested objects are treated as whole fields by the merge (replace, not
 *  union) — see docs/decisions.md ADR "Property-level merge". */
export interface PlantNode {
  /** Stable identifier; typically a slug of the botanical name. */
  id: string
  rank: Rank
  /** Parent node in the taxonomy (a cultivar → its species, etc.). Absent at the root. */
  parentId?: string

  category?: Category
  /** Common name, e.g. "Cornflower". */
  commonName?: string
  /** Additional common names beyond the primary, e.g. ["Bachelor's button"]. Shown as
   *  "also known as …" and folded into search. */
  otherNames?: string[]
  /** Cultivar / variety name, e.g. "Double Blue". Absent above cultivar rank. */
  variety?: string
  /** Botanical name at this node's rank, e.g. "Centaurea cyanus" or "Asteraceae". */
  botanicalName?: string
  /** Alternate / superseded botanical names (e.g. an old genus). Shown as "syn. …" and used
   *  to match sources (or a seed packet) that still use the old name. */
  synonyms?: string[]
  family?: string
  genus?: string

  /** Life cycle(s): any of annual / biennial / perennial. Multi-valued — a plant can
   *  legitimately behave as more than one depending on climate/sowing/growing (see
   *  LifecycleCode). Whole field (replace, not union) like the other closed-vocab arrays. */
  lifecycle?: LifecycleCode[]
  foliage?: 'deciduous' | 'evergreen' | 'semi-evergreen'
  /** Growth habit shortcode from the source (e.g. "clump-forming", "bushy"). */
  habit?: string

  /** Per-month phases for the cheatsheet chart + the jobs engine. */
  calendar?: PhaseSpan[]
  conditions?: Conditions
  size?: Size

  /** Ornamental colour by plant part — the spreadsheet's "seasonal colour". Pairs with the
   *  calendar's state phases (which say WHEN foliage/flower/fruit show); this says WHICH
   *  colour. Free colour words; the UI maps known ones to a swatch. Whole field (replace). */
  colour?: {
    flower?: string[]
    foliage?: string[]
    fruit?: string[]
    stem?: string[]
  }
  /** Edible parts, e.g. ["fruit"], ["leaves"]. Absent = not recorded (not "inedible"). */
  edible?: string[]
  /** Toxicity / harm note, free text (e.g. "Harmful if eaten", "Toxic to cats and dogs"). */
  toxicity?: string
  /** Wildlife value tags, e.g. ["attracts pollinators", "bird food"]. */
  wildlife?: string[]
  /** Suggested uses / garden styles, e.g. ["containers", "cottage garden", "cut flowers"]. */
  uses?: string[]

  /** Free display facts too varied to model — small key/value chips on the cheatsheet
   *  (e.g. "spacing" → "20cm", "germination" → "14–28 days", "sowing depth" → "0.5cm"). */
  facts?: Record<string, string>

  /** Accolades this plant (usually a cultivar) has earned — e.g. a trial/merit award. Free
   *  strings so any scheme fits; NEVER hard-code a specific awarding body's scheme name in
   *  committed data — the private layer supplies real ones. Own-only: not inherited down. */
  awards?: string[]

  /** Pages to enrich this plant from (the acquire step's worklist). Hand-entered when you add
   *  or edit a plant and link its source page(s). Whole field (replace, not union). */
  sourceLinks?: SourceLink[]

  /** Short scannable description (the seed-packet blurb / database summary). */
  summary?: string
  /** Local filename for the hero image (resolved like Forkast's image route). */
  image?: string

  /** Which source last set each top-level field. Keyed by field name. Updated by merge. */
  provenance?: Record<string, FieldSource>
}

/** A guidance article attached to the taxonomy. Usually *linked* (title + url), promoted
 *  to *held* only when you want an offline/annotated copy — see docs/decisions.md ADR
 *  "Link guides, hold cheatsheets". */
export interface Guide {
  id: string
  title: string
  url?: string
  kind: 'grow-guide' | 'technique' | 'pest' | 'disease' | 'general'
  /** Node this guide is relevant to. Aggregates down to descendants at display time. */
  scopeNodeId?: string
  /** Or attach by category (e.g. all `tree`) when there's no single node. */
  scopeCategory?: Category
  /** Held content (markdown), when promoted from a link. Absent for link-only guides. */
  content?: string
  provenance?: FieldSource
}

/** A month-scoped job template attached to a node/category — the reference behind the
 *  aggregated to-do list. Most jobs derive from a node's actionable `calendar` phases;
 *  templates cover the rest ("thin apples in June", "winter-prune fruit trees"). */
export interface TaskTemplate {
  id: string
  /** What to do — mirrors the actionable PhaseCodes plus free ones. */
  action: string
  /** Months this applies (1–12). Empty = condition-based, shown without a month. */
  months: number[]
  scopeNodeId?: string
  scopeCategory?: Category
  note?: string
  provenance?: FieldSource
}

/** The on-disk / importable dataset wrapper. A *fragment* may carry partial nodes for a
 *  merge import; a *full* dataset is what the demo ships and a backup restores. */
export interface PlantDataset {
  version: 1
  generatedAt?: string
  /** The source key for every field in this fragment, unless a field overrides it. Lets a
   *  whole-file import stamp provenance without repeating it per field. */
  source?: string
  nodes?: PlantNode[]
  guides?: Guide[]
  tasks?: TaskTemplate[]
}
