import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Two projects, one runner. The `node` project is the original setup: tight unit tests
// (src/**/*.test.ts) and the Gherkin feature tests (features/**/*.steps.ts) driving the app
// layer against fake-indexeddb, no browser, no React. The `dom` project adds a thin React
// component tier (src/**/*.test.tsx) under jsdom — for characterising UI glue (modal shells,
// editor hooks) that the app-layer tests deliberately sit below. `npm test` runs both.
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['src/**/*.test.ts', 'features/**/*.steps.ts'],
          environment: 'node',
          setupFiles: ['./test/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          include: ['src/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./test/setup.ts', './test/setup.dom.ts'],
        },
      },
    ],
  },
})
