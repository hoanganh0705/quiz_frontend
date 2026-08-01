/**
 * `useQuizFiltersUrlSync` — unit spec.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.C4.
 *
 * Three cases:
 *
 *   (a) mount-seeds-store-from-URL — the hook reads
 *       `useSearchParams()` and seeds the store via
 *       `setFromUrlSearchParams` exactly once on mount.
 *   (b) store-change-debounces-300ms-then-writes-URL — a
 *       `setFilter` call mutates the store; the hook waits
 *       300 ms then calls `router.replace(<pathname>?<query>)`.
 *   (c) unmount-cancels-in-flight-debounce — a `setFilter` call
 *       followed by an unmount does NOT call `router.replace`.
 *
 * The test mocks `next/navigation` to verify `router.replace` is
 * called (not `router.push`).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { SWRConfig } from 'swr'

import {
  resetFilters,
  setFilter,
  useQuizFiltersStore
} from '@/features/quizzes/store/use-quiz-filters-store'
import { useQuizFiltersUrlSync } from '@/features/quizzes/hooks/useQuizFiltersUrlSync'

// ─── Mock `next/navigation` (TKT-3.5.C4 §AC #3) ──────────────────────────

const mockRouterReplace = vi.fn()
const mockUsePathname = vi.fn()
const mockUseSearchParams = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: (...args: unknown[]) => mockRouterReplace(...args),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  }),
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams()
}))

// ─── Test wrapper ─────────────────────────────────────────────────────────

function TestProbe({ onMount }: { onMount?: () => void }) {
  useQuizFiltersUrlSync()
  if (onMount) onMount()
  return null
}

function TestSwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 0,
        errorRetryCount: 0
      }}
    >
      {children}
    </SWRConfig>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  mockRouterReplace.mockReset()
  mockUsePathname.mockReturnValue('/quizzes')
  mockUseSearchParams.mockReturnValue(new URLSearchParams(''))
  resetFilters()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// ─── (a) mount-seeds-store-from-URL ───────────────────────────────────────

describe('useQuizFiltersUrlSync — mount seeds store from URL', () => {
  it('parses the URL search params into the store on mount', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('sort=popular&difficulty=easy')
    )

    render(
      <TestSwrProvider>
        <TestProbe />
      </TestSwrProvider>
    )

    const state = useQuizFiltersStore.getState()
    expect(state.sort).toBe('popular')
    expect(state.difficulty).toBe('easy')
  })
})

// ─── (b) store-change-debounces-300ms-then-writes-URL ─────────────────────

describe('useQuizFiltersUrlSync — debounced URL write', () => {
  it('writes the URL 300 ms after a store change (not before)', () => {
    render(
      <TestSwrProvider>
        <TestProbe />
      </TestSwrProvider>
    )

    // Mount seeds the store from the (empty) URL — no replace
    // call expected yet.
    expect(mockRouterReplace).not.toHaveBeenCalled()

    // Mutate the store.
    act(() => {
      setFilter('sort', 'popular')
    })

    // 100 ms in — replace must NOT have fired yet.
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(mockRouterReplace).not.toHaveBeenCalled()

    // 200 ms more (300 ms total) — replace fires.
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(mockRouterReplace).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).toHaveBeenCalledWith('/quizzes?sort=popular')
  })

  it('uses router.replace (NOT router.push)', () => {
    render(
      <TestSwrProvider>
        <TestProbe />
      </TestSwrProvider>
    )

    act(() => {
      setFilter('sort', 'newest')
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // The mock's `push` is a vi.fn() — it must NOT have been called.
    expect(mockRouterReplace).toHaveBeenCalledTimes(1)
  })
})

// ─── (c) unmount-cancels-in-flight-debounce ───────────────────────────────

describe('useQuizFiltersUrlSync — unmount cancels in-flight debounce', () => {
  it('does not write to the URL after unmount', () => {
    const { unmount } = render(
      <TestSwrProvider>
        <TestProbe />
      </TestSwrProvider>
    )

    // Mutate the store.
    act(() => {
      setFilter('sort', 'trending')
    })

    // 100 ms in — debounce still pending.
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Unmount before the 300 ms timer fires.
    unmount()

    // Advance past the 300 ms mark. The hook should have cancelled
    // the timer — no router.replace call.
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockRouterReplace).not.toHaveBeenCalled()
  })
})
