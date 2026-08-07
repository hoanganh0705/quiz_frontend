/**
 * `useFeaturedQuizzes.spec.tsx` — locks the featured-hook contract.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.C5.
 *
 * Three cases per the ticket:
 *
 *   (a) Happy path — wrapper returns a 3-item array → hook resolves
 *       with `{ quizzes: 3 items, isLoading: false, error: null }`.
 *   (b) Error path — wrapper throws `ApiError(500)` → hook resolves
 *       with `{ quizzes: [], isLoading: false, error: <ApiError 500> }`.
 *   (c) SWR-key stability — the SWR key is `['quizzes', 'featured',
 *       params]` and is stable across re-renders (a single fetcher
 *       call for two mounted instances with the same params).
 *
 * The wrapper is mocked per the Epic 3.5 hook-spec pattern.
 *
 * Test-environment note: vitest's jsdom project picks up files only
 * under the primitives test dir (per `vitest.config.ts` line 41).
 * This spec therefore lives under that directory so the jsdom
 * environment — required for `@testing-library/react` — is applied.
 * The hook under test is in
 * `src/features/quizzes/hooks/useFeaturedQuizzes.ts` (TKT-3.7.C1).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

import { useFeaturedQuizzes } from '@/features/quizzes/hooks/useFeaturedQuizzes'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const getQuizzesFeaturedMock = vi.fn()

vi.mock('@/features/quizzes/services/quizzes.service', async () => {
  const actual =
    await vi.importActual<
      typeof import('@/features/quizzes/services/quizzes.service')
    >('@/features/quizzes/services/quizzes.service')
  return {
    ...actual,
    getQuizzesFeatured: (...args: unknown[]) =>
      getQuizzesFeaturedMock(...args),
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuidV7(index: number): string {
  const tail = String(index).padStart(12, '0')
  return `0192f4d8-0000-7000-8000-${tail}`
}

function makeQuizItem(index: number): QuizListItemDto {
  return {
    quizId: uuidV7(index),
    creatorId: null,
    title: `Featured Quiz ${index}`,
    description: null,
    slug: `featured-quiz-${index}`,
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: true,
    isHidden: false,
    isVerified: true,
    publishedVersionId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  }
}

function makeApiError(status: number, code = 'INTERNAL'): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: `Mock ${status}`,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      data: { code, detail: 'fixture' },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0])
}

function TestSwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 0,
        errorRetryCount: 0,
      }}
    >
      {children}
    </SWRConfig>
  )
}

function makeProbe<T>(useHook: () => T) {
  return function Probe() {
    const value = useHook()
    const v = value as {
      quizzes?: QuizListItemDto[]
      error?: ApiError | null
      isLoading?: boolean
    }
    const snapshot = {
      quizzesLength: v.quizzes ? v.quizzes.length : null,
      errorStatus: v.error ? v.error.status : null,
      isLoading: v.isLoading ?? false,
    }
    return <div data-testid='probe' data-value={JSON.stringify(snapshot)} />
  }
}

function readProbe(): {
  quizzesLength: number | null
  errorStatus: number | null
  isLoading: boolean
} {
  const el = screen.getByTestId('probe')
  return JSON.parse(el.getAttribute('data-value') ?? '{}')
}

afterEach(() => {
  cleanup()
  getQuizzesFeaturedMock.mockReset()
})

// ──────────────────────────────────────────────────────────────────────
// (a) Happy path
// ──────────────────────────────────────────────────────────────────────

describe('useFeaturedQuizzes — happy path', () => {
  it('returns the wrapper-resolved list with isLoading=false and error=null', async () => {
    const list: QuizListItemDto[] = [
      makeQuizItem(1),
      makeQuizItem(2),
      makeQuizItem(3),
    ]
    getQuizzesFeaturedMock.mockResolvedValue({ data: list })

    const Probe = makeProbe(() => useFeaturedQuizzes({ limit: 6 }))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.quizzesLength).toBe(3)
      expect(snap.errorStatus).toBeNull()
      expect(snap.isLoading).toBe(false)
    })

    expect(getQuizzesFeaturedMock).toHaveBeenCalledWith({ limit: 6 })
  })

  it('returns an empty list when the wrapper returns `{ data: undefined }`', async () => {
    getQuizzesFeaturedMock.mockResolvedValue({ data: undefined })

    const Probe = makeProbe(() => useFeaturedQuizzes({ limit: 6 }))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.quizzesLength).toBe(0)
      expect(snap.errorStatus).toBeNull()
    })
  })
})

// ──────────────────────────────────────────────────────────────────────
// (b) Error path
// ──────────────────────────────────────────────────────────────────────

describe('useFeaturedQuizzes — error path', () => {
  it('returns an empty list with error.status=500 when the wrapper throws', async () => {
    getQuizzesFeaturedMock.mockRejectedValue(makeApiError(500))

    const Probe = makeProbe(() => useFeaturedQuizzes({ limit: 6 }))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.errorStatus).toBe(500)
      expect(snap.quizzesLength).toBe(0)
      expect(snap.isLoading).toBe(false)
    })
  })

  it('surfaces a typed ApiError (not an unknown) for the error path', async () => {
    getQuizzesFeaturedMock.mockRejectedValue(makeApiError(503))

    function Capture() {
      const { error } = useFeaturedQuizzes({ limit: 6 })
      // Render the captured error into the DOM so the test assertion
      // can read it. This sidesteps the react-hooks lint rule against
      // mutating refs/effect-captured variables inside the render body.
      return (
        <div
          data-testid='probe'
          data-error-status={error && 'status' in error ? error.status : null}
        />
      )
    }

    render(
      <TestSwrProvider>
        <Capture />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByTestId('probe').getAttribute('data-error-status'),
      ).toBe('503')
    })
  })
})

// ──────────────────────────────────────────────────────────────────────
// (c) SWR-key stability
// ──────────────────────────────────────────────────────────────────────

describe('useFeaturedQuizzes — SWR-key stability', () => {
  it('two calls with the same params produce a single fetcher call (key is stable)', async () => {
    getQuizzesFeaturedMock.mockResolvedValue({
      data: [makeQuizItem(1)],
    })

    function DoubleProbe() {
      const a = useFeaturedQuizzes({ limit: 6 })
      const b = useFeaturedQuizzes({ limit: 6 })
      return (
        <div
          data-testid='probe'
          data-a={a.quizzes.length}
          data-b={b.quizzes.length}
        />
      )
    }

    render(
      <TestSwrProvider>
        <DoubleProbe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const el = screen.getByTestId('probe')
      expect(el.getAttribute('data-a')).toBe('1')
      expect(el.getAttribute('data-b')).toBe('1')
    })

    // SWR's deduping window collapses two calls with the same key
    // into one fetcher invocation. The test confirms the hook's key
    // shape is stable across renders.
    expect(getQuizzesFeaturedMock).toHaveBeenCalledTimes(1)
  })

  it('the wrapper is called without a cursor (featured is non-paginated)', async () => {
    getQuizzesFeaturedMock.mockResolvedValue({
      data: [makeQuizItem(1)],
    })

    const Probe = makeProbe(() => useFeaturedQuizzes({ limit: 6 }))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.quizzesLength).toBe(1)
    })

    // The call signature should be exactly `{ limit: 6 }` — no
    // `cursor`, no `categoryId` (TKT-3.7.C1 AC #4 + #5).
    expect(getQuizzesFeaturedMock).toHaveBeenCalledWith({ limit: 6 })
    const callArg = getQuizzesFeaturedMock.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >
    expect(callArg).not.toHaveProperty('cursor')
    expect(callArg).not.toHaveProperty('categoryId')
  })
})
