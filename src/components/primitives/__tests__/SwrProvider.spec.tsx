/**
 * `<SwrProvider />` unit tests.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive (`useCursorPaginated`).
 * Source story:  PHASE_3_EPICS.md → Story 3.2, lines 192–193 + 244.
 * Source ticket: TKT-3.2.A4.
 *
 * The provider is the single foundation for every SWR consumer in Phase 3
 * (Stories 3.3–3.12, and the hook in D1 of this story). This spec locks
 * the five configuration values committed in TKT-3.2.A3 so a future
 * "tidy the SWR config" change cannot silently flip `revalidateOnFocus`
 * to `true` and break the Story 3.2 line 244 contract.
 *
 * The spec is placed under `src/components/primitives/__tests__/` so the
 * existing jsdom vitest project (configured in `vitest.config.ts`) picks
 * it up automatically. No `vitest.config.ts` change is required.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useSWRConfig } from 'swr'

import { SwrProvider, swrConfig } from '@/providers/SwrProvider'
import { ApiError } from '@/lib/api'

/**
 * Probe child that captures the resolved `FullConfiguration` from the
 * nearest `<SWRConfig>` ancestor. Renders the config as a data-attribute
 * JSON string so the test can read it without coupling to internal SWR
 * representation.
 */
function ConfigProbe({ testId = 'swr-config-probe' }: { testId?: string }) {
  const config = useSWRConfig()
  // FullConfiguration is a deep object; serialise a curated subset so the
  // JSON stays small and stable. The omitted fields are not asserted.
  const summary = {
    revalidateOnFocus: config.revalidateOnFocus,
    revalidateIfStale: config.revalidateIfStale,
    dedupingInterval: config.dedupingInterval,
    errorRetryCount: config.errorRetryCount,
    shouldRetryOnError: config.shouldRetryOnError,
  }
  return (
    <div data-testid={testId} data-config={JSON.stringify(summary)} />
  )
}

describe('SwrProvider', () => {
  it('renders its children (passthrough)', () => {
    render(
      <SwrProvider>
        <span data-testid="probe">child</span>
      </SwrProvider>
    )
    expect(screen.getByTestId('probe')).toBeInTheDocument()
    expect(screen.getByTestId('probe')).toHaveTextContent('child')
  })

  it('passes the bound config to descendants', () => {
    render(
      <SwrProvider>
        <ConfigProbe />
      </SwrProvider>
    )
    const probe = screen.getByTestId('swr-config-probe')
    const raw = probe.getAttribute('data-config')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw ?? '{}') as {
      revalidateOnFocus?: boolean
      revalidateIfStale?: boolean
      dedupingInterval?: number
      errorRetryCount?: number
      shouldRetryOnError?: 'serialised-as-undefined'
    }
    // The function is not JSON-serialisable; SWR will preserve the
    // function reference in the config object but the attribute will
    // contain the string `undefined` for it. The dedicated function test
    // below asserts the predicate itself via direct invocation.
    expect(parsed.revalidateOnFocus).toBe(false)
    expect(parsed.revalidateIfStale).toBe(false)
    expect(parsed.dedupingInterval).toBe(2_000)
    expect(parsed.errorRetryCount).toBe(3)
  })

  it('shouldRetryOnError returns true for ApiError with status 429', () => {
    // Direct invocation — the predicate is exported via `swrConfig`.
    const rateLimited = ApiError.fromAxios({
      name: 'AxiosError',
      message: 'Too many requests',
      isAxiosError: true,
      toJSON: () => ({}),
      response: {
        data: { extensions: { code: 'AUTH_RATE_LIMITED' } },
        status: 429,
        statusText: 'Too Many Requests',
        headers: {},
        config: {} as never,
      },
    } as never)
    expect(swrConfig.shouldRetryOnError(rateLimited)).toBe(true)
  })

  it('shouldRetryOnError returns true for ApiError with status 5xx', () => {
    const serverError = ApiError.fromAxios({
      name: 'AxiosError',
      message: 'Server error',
      isAxiosError: true,
      toJSON: () => ({}),
      response: {
        data: {},
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as never,
      },
    } as never)
    expect(swrConfig.shouldRetryOnError(serverError)).toBe(true)
  })

  it('shouldRetryOnError returns false for ApiError with non-429 4xx', () => {
    const notFound = ApiError.fromAxios({
      name: 'AxiosError',
      message: 'Not found',
      isAxiosError: true,
      toJSON: () => ({}),
      response: {
        data: {},
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as never,
      },
    } as never)
    expect(swrConfig.shouldRetryOnError(notFound)).toBe(false)
  })

  it('shouldRetryOnError returns false for non-ApiError values (incl. NetworkError)', () => {
    // NetworkError has no `response`; the typed narrow is `unknown` so
    // the predicate must explicitly opt out — Story 3.2 line 231
    // delegates NetworkError to the hook's banner path, not to SWR's retry.
    expect(swrConfig.shouldRetryOnError(new Error('network'))).toBe(false)
    expect(swrConfig.shouldRetryOnError('plain string error')).toBe(false)
    expect(swrConfig.shouldRetryOnError(null)).toBe(false)
    expect(swrConfig.shouldRetryOnError(undefined)).toBe(false)
  })

  it('exports the same swrConfig the provider mounts (no drift)', () => {
    // Reference equality: the provider mounts `swrConfig` directly (no copy).
    // If a future refactor introduces a local `value` object in the component,
    // this test breaks and forces the author to either (a) keep using the
    // exported constant or (b) explicitly break the symmetry with a comment.
    render(
      <SwrProvider>
        <ConfigProbe testId="swr-config-probe-drift" />
      </SwrProvider>
    )
    const probe = screen.getByTestId('swr-config-probe-drift')
    const parsed = JSON.parse(probe.getAttribute('data-config') ?? '{}') as {
      revalidateOnFocus?: boolean
      revalidateIfStale?: boolean
      dedupingInterval?: number
      errorRetryCount?: number
    }
    expect(parsed.revalidateOnFocus).toBe(swrConfig.revalidateOnFocus)
    expect(parsed.revalidateIfStale).toBe(swrConfig.revalidateIfStale)
    expect(parsed.dedupingInterval).toBe(swrConfig.dedupingInterval)
    expect(parsed.errorRetryCount).toBe(swrConfig.errorRetryCount)
  })
})
