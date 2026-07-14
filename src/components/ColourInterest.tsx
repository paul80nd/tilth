import type { PlantNode } from '../schema/plant'
import { colourSwatch } from '../lib/colour'

// The "seasonal colour" of the spreadsheet: ornamental colour by plant part. Each colour word
// gets a swatch dot where we recognise it (lib/colour), else just the label. Pairs with the
// calendar's state phases, which say *when* flower/foliage/fruit show.

type ColourField = NonNullable<PlantNode['colour']>

const PARTS: Array<{ key: keyof ColourField; label: string }> = [
  { key: 'flower', label: 'Flower' },
  { key: 'foliage', label: 'Foliage' },
  { key: 'fruit', label: 'Fruit' },
  { key: 'stem', label: 'Stem' },
]

function Swatch({ name }: { name: string }) {
  const hex = colourSwatch(name)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-sunken px-2 py-0.5 text-sm">
      {hex && (
        <span
          className="h-3 w-3 flex-none rounded-full ring-1 ring-line-strong"
          style={{ backgroundColor: hex }}
          aria-hidden="true"
        />
      )}
      {name}
    </span>
  )
}

export default function ColourInterest({ colour }: { colour: ColourField }) {
  return (
    <dl className="flex flex-col gap-2">
      {PARTS.map(({ key, label }) => {
        const values = colour[key]
        if (!values?.length) return null
        return (
          <div key={key} className="flex items-baseline gap-3">
            <dt className="w-16 flex-none text-xs uppercase tracking-wide text-subtle">{label}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {values.map((v) => (
                <Swatch key={v} name={v} />
              ))}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
