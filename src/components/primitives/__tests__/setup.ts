/**
 * Vitest setup file for Story 3.1 DOM specs.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.B3 + TKT-3.1.C5 + TKT-3.1.D2.
 *
 * Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 * and configures a sane default for cleanup so each test starts with a
 * fresh DOM. cleanup is the testing-library default; we set it
 * explicitly for clarity.
 */

import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

class TestResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= TestResizeObserver

afterEach(() => {
  cleanup()
})