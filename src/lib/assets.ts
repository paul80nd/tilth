// Resolve a committed asset reference (e.g. the demo dataset) to a usable URL under the
// app's base path, so it works both at "/" in dev and under the GitHub Pages sub-path.
// Absolute URLs pass through untouched.
//
// NOTE: plant *image* resolution (a dev-only private route + an in-app content-addressed
// cache) is deliberately NOT here yet — it's designed alongside the cheatsheet/image model
// (see docs/spec.md § Persistence, ⟲ Open). This helper only covers committed paths.
export function resolveAsset(ref: string): string {
  if (/^(https?:|data:|blob:)/.test(ref)) return ref
  return import.meta.env.BASE_URL + ref.replace(/^\//, '')
}
