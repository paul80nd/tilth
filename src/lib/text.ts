// Small string helpers shared across the display layer and the label libs.

/** Upper-case the first character, leaving the rest untouched ("full sun" → "Full sun"). */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
