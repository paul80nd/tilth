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
// fruit). Each keeps its source's native viewBox and paint (leaf + flower are solid fills;
// fruit is stroked cherries) — they read as strong silhouettes rather than the fine line icons
// above. Tinted via currentColor by the caller. From open sets: Material (leaf), SmartIcons
// (flower), ByteDance (fruit).
type SeasonalPart = 'foliage' | 'flower' | 'fruit'

const SEASONAL: Record<SeasonalPart, { viewBox: string; body: React.ReactNode }> = {
  foliage: {
    viewBox: '0 0 24 24',
    body: (
      <path
        fill="currentColor"
        d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8"
      />
    ),
  },
  flower: {
    viewBox: '0 0 16 16',
    body: (
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.164 8.404c-.171-.094-.522-.237-.982-.403c.46-.166.81-.308.981-.402c1.016-.549 1.121-2.16.235-3.598c-.887-1.437-2.429-2.157-3.444-1.609c-.173.095-.48.306-.865.597c.078-.458.119-.814.119-1c0-1.1-1.437-1.99-3.208-1.99s-3.21.89-3.21 1.99c0 .186.043.541.121.998a9 9 0 0 0-.863-.596C3.032 1.842 1.488 2.562.603 4s-.779 3.048.235 3.597c.173.095.522.238.985.404c-.463.167-.814.31-.986.404c-1.016.549-1.121 2.158-.235 3.597c.886 1.437 2.429 2.157 3.444 1.608c.173-.093.479-.304.865-.595c-.078.457-.121.81-.121.997c0 1.099 1.436 1.989 3.21 1.989c1.771 0 3.208-.89 3.208-1.989c0-.187-.041-.542-.119-1.001c.385.293.693.505.866.598c1.016.549 2.558-.17 3.443-1.607c.887-1.439.781-3.049-.234-3.598M8 11.047a3.047 3.047 0 1 1 0-6.092a3.05 3.05 0 0 1 3.049 3.046A3.05 3.05 0 0 1 8 11.047"
      />
    ),
  },
  fruit: {
    viewBox: '0 0 48 48',
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
  return (
    <svg width={size} height={size} viewBox={g.viewBox} aria-hidden="true" {...props}>
      {g.body}
    </svg>
  )
}
