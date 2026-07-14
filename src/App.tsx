// Placeholder app shell. Real routes (Browse / Cheatsheet / Holdings / Jobs / Config) land
// as the features in docs/spec.md are built. Kept intentionally minimal and palette-light
// until Tilth has its own design system.
export default function App() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Tilth</h1>
      <p className="mt-2 text-neutral-600">
        A local-first almanac for everything you grow. Scaffolding in progress — see{' '}
        <code>docs/spec.md</code>.
      </p>
    </main>
  )
}
