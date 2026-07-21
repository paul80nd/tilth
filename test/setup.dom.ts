// Setup for the `dom` project only (jsdom): register jest-dom's matchers (toBeInTheDocument,
// …) on Vitest's expect, and unmount rendered trees after each test. Loaded only for
// *.test.tsx so the node project never imports React Testing Library.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
