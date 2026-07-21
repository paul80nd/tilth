// Join class names, dropping falsy parts — the tiny clsx-style helper for conditional classes
// (`cx('base', on && 'active')`), so components stop hand-rolling `[...].join(' ')`.
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
