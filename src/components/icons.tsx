// A small, self-drawn line-icon set for the cheatsheet's "at a glance" facts. Generic
// pictograms (currentColor stroke) — nothing copied from any source. Keyed by a name so the
// facts panel can look one up per field.
import type { SVGProps } from 'react'
import type { InterestPart } from '../schema/plant'

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
//   fruit   — MingCute (MingCute Design), Apache-2.0
//   stem    — drawn by hand for Tilth (a bundle of coloured canes; no good permissive SVG found)

// `scale` visually balances the three: their source artworks fill their viewBoxes by different
// amounts, so at one nominal size the flower/fruit read larger than the leaf. These factors bring
// all three to the same apparent size (leaf is the reference at 1).
const SEASONAL: Record<InterestPart, { viewBox: string; scale: number; body: React.ReactNode }> = {
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
    viewBox: '0 0 24 24',
    scale: 1,
    // MingCute "fruit" — a rounded twin-lobed fruit; near-symmetric, so the multi-colour sweep
    // reads cleanly. (Its transparent bounding path is dropped; only the painted body kept.)
    body: (
      <path
        fill="currentColor"
        d="M15.6 3a.9.9 0 0 1 0 1.8c-1 0-1.739.625-2.232 1.666c1.259-.53 2.607-.713 3.814-.39c1.652.443 2.912 1.38 3.507 2.97c.569 1.52.47 3.485-.172 5.884c-.515 1.923-1.446 3.596-2.71 4.695c-1.287 1.118-2.922 1.633-4.691 1.16a5.7 5.7 0 0 1-1.117-.434a5.7 5.7 0 0 1-1.116.434c-1.769.473-3.404-.042-4.69-1.16c-1.265-1.1-2.195-2.772-2.71-4.695c-.643-2.399-.741-4.365-.173-5.883c.596-1.59 1.856-2.528 3.508-2.97c.732-.196 1.515-.207 2.3-.066C8.29 5.246 7.97 4.189 8.077 4c.131-.225 1.663-.544 2.909.175c.445.257.793.613 1.05.973C12.749 3.976 13.899 3 15.6 3"
      />
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
}: { part: InterestPart; size?: number } & SVGProps<SVGSVGElement>) {
  const g = SEASONAL[part]
  const px = Math.round(size * g.scale)
  return (
    <svg width={px} height={px} viewBox={g.viewBox} aria-hidden="true" {...props}>
      {g.body}
    </svg>
  )
}
