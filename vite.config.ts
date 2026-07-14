import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from a project sub-path on GitHub Pages (paul80nd.github.io/tilth/), so the
  // production build needs that base for assets + demo data to resolve. Dev/preview stay
  // at "/" so the local dev server and the screenshot/audit scripts keep their URLs.
  //
  // NOTE: plant images (the cheatsheet is image-dense, and source imagery is private) will
  // want a dev-only static route + an in-app image cache, mirroring Forkast's
  // `privateImages` middleware + image pack. Deferred until the image model is designed —
  // see docs/spec.md.
  base: command === 'build' ? '/tilth/' : '/',
  plugins: [react(), tailwindcss()],
}))
