'use client'

/**
 * Global SWR configuration provider.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive (`useCursorPaginated`).
 * Source ticket: TKT-3.2.A3.
 * Source story:  PHASE_3_EPICS.md → Story 3.2, lines 192–193 (provider prerequisite)
 *                and line 244 (`revalidateOnFocus: false` for Phase 3 lists).
 *
 * Mounts a single `<SWRConfig value={…}>` whose defaults match the
 * cross-story contract rules for Phase 3 read-mostly lists. The hook
 * (`useCursorPaginated`, D1) and every later consumer in Stories 3.3–3.12
 * inherit these values; no per-call site re-specification is required.
 *
 * Config values are bound by the planning document §A2 evidence report
 * (`EPIC_3_2_A2.md`, §4). Do not change any of them without updating
 * the A4 spec; the spec asserts the values literally.
 *
 * Scope: this provider is config-only. It does not import `axios` and
 * does not import from `@/lib/api/generated/*` (per A3 AC #4). It only
 * imports the `ApiError` type from the public barrel, which is the
 * contract-allowed way to type the `shouldRetryOnError` predicate.
 */

import type { ReactNode } from 'react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'

/**
 * The SWR configuration object mounted by `<SwrProvider>`.
 *
 * Exported so A4's spec can import it and assert its shape/value
 * (the spec uses `Object.values` / per-key checks against this constant
 * rather than re-typing the literal in the test file, so a future
 * config change touches exactly two files: this one and the spec).
 */
export const swrConfig = {
  // Story 3.2 line 244 — Phase 3 lists refresh on route entry, not on focus.
  revalidateOnFocus: false,
  // Same rationale — no stale-check on mount; refresh is route-entry-driven.
  revalidateIfStale: false,
  // Two-second dedupe window prevents a fast double-mount of the same list
  // (e.g. Strict-Mode double-render in dev) from firing two fetches.
  dedupingInterval: 2_000,
  // Backs the 429 exponential-backoff budget (Story 3.2 line 228, D5 AC #1).
  // Combined with `shouldRetryOnError` below, this caps the outer retry
  // attempt count; the hook's own 429 backoff is layered on top.
  errorRetryCount: 3,
  // Restrict automatic retry to rate-limited (429) and server-error (5xx)
  // responses. 4xx errors other than 429 (e.g. 400, 401, 403, 404, 409, 422)
  // are surfaced immediately to the consumer — retrying them is wrong.
  // `NetworkError` (no response) returns `false` here so the hook's own
  // "no partial-page error" branch in Story 3.2 line 231 takes over.
  shouldRetryOnError: (err: unknown): boolean => {
    if (err instanceof ApiError) {
      return err.status === 429 || err.status >= 500
    }
    return false
  },
} as const

/**
 * App-wide SWR configuration provider.
 *
 * Wrap the application tree in this component exactly once, between
 * `<ThemeProvider>` and `<LayoutShell>`, so every consumer of the
 * `useSWR` / `useSWRInfinite` family inherits the config above.
 *
 * @example
 *   // app/layout.tsx
 *   <ThemeProvider …>
 *     <SwrProvider>
 *       <LayoutShell>{children}</LayoutShell>
 *     </SwrProvider>
 *   </ThemeProvider>
 */
export function SwrProvider({ children }: { children: ReactNode }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>
}
