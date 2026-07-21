// Structural value-equality over the plain-JSON shapes our data carries (scalars, string
// arrays, {source,url,label} arrays, the facts map). Key order is ignored for objects. Pure and
// shared by the edit-diff (editNode) and the import-diff (importDiff).

/** True for a plain (non-array, non-null) object — the shared guard for our JSON-shaped data,
 *  reused by the merge overlay, the import/backup parsers, and deepEqual below. */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ak = Object.keys(a)
    const bk = Object.keys(b)
    return ak.length === bk.length && ak.every((k) => k in b && deepEqual(a[k], b[k]))
  }
  return false
}
