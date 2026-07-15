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

// Bolder, filled glyphs for the seasonal-interest strip's three parts (foliage / flower /
// fruit). Each keeps its source's native viewBox and paint — they read as strong silhouettes
// rather than the fine line icons above. Tinted via currentColor by the caller. Third-party
// icons (permissive licences; recoloured + resized here) — see CREDITS.md:
//   foliage — Material Design Icons (Pictogrammers), Apache-2.0
//   flower  — Ionicons (Ben Sperry / Ionic), MIT
//   fruit   — IconPark (ByteDance), Apache-2.0
type SeasonalPart = 'foliage' | 'flower' | 'fruit'

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
    viewBox: '0 0 512 512',
    scale: 0.86,
    body: (
      <>
        <circle cx="256" cy="256" r="48" fill="currentColor" />
        <path
          fill="currentColor"
          d="M475.93 303.91a67.49 67.49 0 0 0-44.34-115.53a5.2 5.2 0 0 1-4.58-3.21a5.21 5.21 0 0 1 1-5.51A67.83 67.83 0 0 0 378 66.33h-.25A67.13 67.13 0 0 0 332.35 84a5.21 5.21 0 0 1-5.52 1a5.23 5.23 0 0 1-3.22-4.58a67.68 67.68 0 0 0-135.23 0a5.2 5.2 0 0 1-3.21 4.58a5.21 5.21 0 0 1-5.52-1a67.1 67.1 0 0 0-45.44-17.69H134a67.91 67.91 0 0 0-50 113.34a5.21 5.21 0 0 1 1 5.51a5.2 5.2 0 0 1-4.58 3.21a67.71 67.71 0 0 0 0 135.23a5.23 5.23 0 0 1 4.58 3.23a5.22 5.22 0 0 1-1 5.52a67.54 67.54 0 0 0 50.08 113h.25A67.38 67.38 0 0 0 179.65 428a5.21 5.21 0 0 1 5.51-1a5.2 5.2 0 0 1 3.21 4.58a67.71 67.71 0 0 0 135.23 0a5.23 5.23 0 0 1 3.22-4.58a5.21 5.21 0 0 1 5.51 1a67.38 67.38 0 0 0 45.29 17.42h.25a67.48 67.48 0 0 0 50.08-113a5.22 5.22 0 0 1-1-5.52a5.23 5.23 0 0 1 4.58-3.22a67.3 67.3 0 0 0 44.4-19.77M256 336a80 80 0 1 1 80-80a80.09 80.09 0 0 1-80 80"
        />
      </>
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
