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
