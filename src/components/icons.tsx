// A small, self-drawn line-icon set for the cheatsheet's "at a glance" facts. Generic
// pictograms (currentColor stroke) — nothing copied from any source. Keyed by a name so the
// facts panel can look one up per field.
import type { SVGProps } from 'react'

export type IconName =
  | 'sun'
  | 'aspect'
  | 'soil'
  | 'moisture'
  | 'ph'
  | 'exposure'
  | 'height'
  | 'spread'
  | 'time'
  | 'hardiness'
  | 'edible'
  | 'toxicity'

const PATHS: Record<IconName, React.ReactNode> = {
  // sun — light / position
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  // aspect — compass
  aspect: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12l4-6-6 4z" />
      <path d="M12 12l-2 4" />
    </>
  ),
  // soil — layered ground with a sprout
  soil: (
    <>
      <path d="M3 15h18M3 19h18" />
      <path d="M12 12V7M12 7c-1.5 0-2.5-1-2.5-2M12 7c1.3 0 2.3-.8 2.3-1.8" />
    </>
  ),
  // moisture — droplet
  moisture: <path d="M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3z" />,
  // ph — flask
  ph: (
    <>
      <path d="M10 3h4M10.5 3v6L6 18a1.5 1.5 0 0 0 1.4 2h9.2A1.5 1.5 0 0 0 18 18l-4.5-9V3" />
      <path d="M8.2 14h7.6" />
    </>
  ),
  // exposure — wind
  exposure: <path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5M3 12h15a2.5 2.5 0 1 1-2.5 2.5M3 16h9a2 2 0 1 1-2 2" />,
  // height — vertical extent
  height: <path d="M12 3v18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3" />,
  // spread — horizontal extent
  spread: <path d="M3 12h18M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />,
  // time — clock
  time: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  // hardiness — snowflake
  hardiness: (
    <path d="M12 2v20M4 7l16 10M20 7L4 17M12 5l-2.5 2M12 5l2.5 2M12 19l-2.5-2M12 19l2.5-2M4.5 9.5l.5 3M19.5 9.5l-.5 3M4.5 14.5l.5-3M19.5 14.5l-.5-3" />
  ),
  // edible — fork & knife
  edible: <path d="M7 3v7a2 2 0 0 0 2 2v9M7 3v4M9.5 3v4M17 3c-1.5 1-2 3-2 5s.5 3 2 3v10" />,
  // toxicity — warning triangle
  toxicity: (
    <>
      <path d="M12 4L2.5 20h19z" />
      <path d="M12 10v4M12 17.5v.5" />
    </>
  ),
}

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}

// Bolder, filled glyphs for the seasonal-interest strip's parts (foliage / flower / fruit / stem).
// Each keeps its source's native viewBox and paint — they read as strong silhouettes rather than
// the fine line icons above. Tinted via currentColor by the caller. Third-party icons (permissive
// licences; recoloured + resized here) — see CREDITS.md:
//   foliage — Material Design Icons (Pictogrammers), Apache-2.0
//   flower  — Tabler Icons (Paweł Kuna), MIT
//   fruit   — IconPark (ByteDance), Apache-2.0
//   stem    — drawn by hand for Tilth (a bundle of coloured canes; no good permissive SVG found)
type SeasonalPart = 'foliage' | 'flower' | 'fruit' | 'stem'

// `scale` visually balances the three: their source artworks fill their viewBoxes by different
// amounts, so at one nominal size the flower/fruit read larger than the leaf. These factors bring
// all three to the same apparent size (leaf is the reference at 1).
const SEASONAL: Record<SeasonalPart, { viewBox: string; scale: number; body: React.ReactNode }> = {
  foliage: {
    viewBox: '0 0 24 24',
    scale: 1,
    body: (
      <path
        fill="currentColor"
        d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8"
      />
    ),
  },
  flower: {
    viewBox: '0 0 24 24',
    scale: 0.85,
    // Tabler "flower" as-drawn — keeping its hollow centre (the card shows through). Sized down a
    // touch so it reads the same weight as the leaf/fruit.
    body: (
      <path
        fill="currentColor"
        d="M12 1a4 4 0 0 1 4 4l-.002.055l.03-.018a3.97 3.97 0 0 1 2.79-.455l.237.056a3.97 3.97 0 0 1 2.412 1.865a4.01 4.01 0 0 1-1.455 5.461l-.068.036l.071.039a4.01 4.01 0 0 1 1.555 5.27l-.101.186a3.97 3.97 0 0 1-5.441 1.468l-.03-.02L16 19a4 4 0 0 1-3.8 3.995L12 23a4 4 0 0 1-4-4l.001-.056l-.029.019a3.97 3.97 0 0 1-2.79.456l-.236-.056a3.97 3.97 0 0 1-2.413-1.865a4.01 4.01 0 0 1 1.453-5.46l.07-.038l-.071-.038a4.01 4.01 0 0 1-1.555-5.27l.1-.187a3.97 3.97 0 0 1 5.444-1.468L8 5.055V5a4 4 0 0 1 3.8-3.995zm0 8a3 3 0 1 0 0 6a3 3 0 0 0 0-6"
      />
    ),
  },
  fruit: {
    viewBox: '0 0 48 48',
    scale: 0.86,
    body: (
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={4}>
        <circle cx="14" cy="34" r="8" fill="currentColor" strokeLinejoin="round" />
        <circle cx="35" cy="37" r="7" fill="currentColor" strokeLinejoin="round" />
        <path d="M37 10c-2.651.812-8.372 3.015-11.72 6.26C20.255 21.13 19 24.5 18 27m19-17c-1.117 1.318-3.285 4.596-3.956 8.39C32.036 24.078 33 27.5 34 30M30 4l14 12" />
      </g>
    ),
  },
  // A bundle of three bold coloured canes/stalks fanning up from a shared base (rhubarb / dogwood).
  stem: {
    viewBox: '0 0 24 24',
    scale: 0.94,
    body: (
      <g fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round">
        <path d="M8.5 20.5L6.5 4.5" />
        <path d="M12 21V4" />
        <path d="M15.5 20.5l2-16" />
      </g>
    ),
  },
}

export function SeasonalIcon({
  part,
  size = 36,
  ...props
}: { part: SeasonalPart; size?: number } & SVGProps<SVGSVGElement>) {
  const g = SEASONAL[part]
  const px = Math.round(size * g.scale)
  return (
    <svg width={px} height={px} viewBox={g.viewBox} aria-hidden="true" {...props}>
      {g.body}
    </svg>
  )
}
