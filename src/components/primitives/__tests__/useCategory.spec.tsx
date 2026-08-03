/**
 * `useCategory` — unit spec.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.B6.
 *
 * Three cases (per B6 AC #1):
 *
 *   (a) happy path: wrapper returns a category payload → hook returns
 *       `{ category: <CategoryResponseDto>, isLoading: false, error: null, notFound: false }`.
 *   (b) 404 path: wrapper throws an `ApiError(404)` → hook returns
 *       `{ category: null, isLoading: false, error: <ApiError>, notFound: true }`.
 *   (c) 5xx path: wrapper throws an `ApiError(500)` → hook returns
 *       `{ category: null, isLoading: false, error: <ApiError>, notFound: false }`.
 *
 * The 404-→-notFound contract is the AC #5 closure for Story 3.3 ("404
 * on `/categories/:id` → render the `NotFound` component").
 *
 * Test-environment note (B6 AC #1):
 *
 *   - The file lives under `src/components/primitives/__tests__/` so
 *     vitest's `jsdom` project picks it up (configured in
 *     `vitest.config.ts`). The Epic 3.2 spec is the precedent.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type { CategoryResponseDto } from '@/lib/api/generated/schemas'

import { useCategory } from '@/features/categories/hooks/useCategory'

// ---------------------------------------------------------------------------
// Mocks — module-level mocks for the SDK wrappers (TKT-3.3.A2)
// ---------------------------------------------------------------------------

const getCategoryBySlugMock = vi.fn()

vi.mock('@/features/categories/services/categories.service', () => ({
  getCategoryBySlug: (...args: unknown[]) =>
    getCategoryBySlugMock(...args),
  // Other exports retained as no-ops; the hook under test only
  // touches `getCategoryBySlug`.
  listCategories: vi.fn(),
  getCategory: vi.fn(),
  getCategoriesRanked: vi.fn(),
  getCategoriesTrending: vi.fn(),
  getCategoryQuizzes: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

function makeCategory(
  overrides: Partial<CategoryResponseDto> = {},
): CategoryResponseDto {
  return {
    categoryId: '0192f4d8-0000-7000-8000-000000000001',
    name: 'Science',
    description: 'A description of science',
    slug: 'science',
    imageUrl: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeApiError(status: number, code = 'INTERNAL'): ApiError {
  return new ApiError({
    config: undefined,
    request: undefined,
    response: {
      status,
      data: { code, detail: 'fixture' },
    },
    isAxiosError: true,
    name: 'AxiosError',
    message: `Mock ${status}`,
    code,
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0])
}

// ---------------------------------------------------------------------------
// Per-test SWR provider (fresh cache to dodge cross-test cache leaks)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Probe component
// ---------------------------------------------------------------------------

function Probe() {
  const { category, isLoading, error, notFound } = useCategory('science')
  const snapshot = {
    categoryName: category?.name ?? null,
    categoryIsNull: category === null,
    notFound,
    errorStatus: error ? error.status : null,
    isLoading,
  }
  return <div data-testid='probe' data-value={JSON.stringify(snapshot)} />
}

function readProbe(): {
  categoryName: string | null
  categoryIsNull: boolean
  notFound: boolean
  errorStatus: number | null
  isLoading: boolean
} {
  const el = screen.getByTestId('probe')
  return JSON.parse(el.getAttribute('data-value') ?? '{}')
}

afterEach(() => {
  cleanup()
  getCategoryBySlugMock.mockReset()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCategory — happy path', () => {
  it('returns the wrapper-resolved category with isLoading=false, error=null, notFound=false', async () => {
    const category = makeCategory({ name: 'Science', slug: 'science' })
    getCategoryBySlugMock.mockResolvedValue({ data: category })

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.categoryName).toBe('Science')
      expect(snap.errorStatus).toBeNull()
      expect(snap.notFound).toBe(false)
      expect(snap.isLoading).toBe(false)
    })

    expect(getCategoryBySlugMock).toHaveBeenCalledWith('science')
  })
})

describe('useCategory — 404 path', () => {
  it('returns category=null, notFound=true, error.status=404 when the wrapper throws 404', async () => {
    getCategoryBySlugMock.mockRejectedValue(makeApiError(404, 'CATEGORY_NOT_FOUND'))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.categoryIsNull).toBe(true)
      expect(snap.notFound).toBe(true)
      expect(snap.errorStatus).toBe(404)
      expect(snap.isLoading).toBe(false)
    })
  })
})

describe('useCategory — 5xx path', () => {
  it('returns category=null, notFound=false, error.status=500 when the wrapper throws 500', async () => {
    getCategoryBySlugMock.mockRejectedValue(makeApiError(500))

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.categoryIsNull).toBe(true)
      expect(snap.notFound).toBe(false)
      expect(snap.errorStatus).toBe(500)
      expect(snap.isLoading).toBe(false)
    })
  })
})

/**
 * F2 — deleted-category defensive path.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.F2.
 *
 * Story 3.3 line 351: a category marked as deleted may still resolve
 * via direct URL → the backend returns 404 with the
 * `CATEGORY_DELETED` code → the page renders `NotFound`.
 *
 * The hook's contract is `notFound: error.status === 404` — so any
 * 404 (including `CATEGORY_DELETED`) maps to `notFound: true`. This
 * test is the regression lock: a future change that adds 404
 * subclassing (e.g. distinguishing "soft-deleted" from "never
 * existed") must NOT regress this case.
 */
describe('useCategory — deleted-category defensive path (F2)', () => {
  it('returns notFound=true when the wrapper throws ApiError(404, code="CATEGORY_DELETED")', async () => {
    getCategoryBySlugMock.mockRejectedValue(
      makeApiError(404, 'CATEGORY_DELETED'),
    )

    render(
      <TestSwrProvider>
        <Probe />
      </TestSwrProvider>,
    )

    await waitFor(() => {
      const snap = readProbe()
      expect(snap.categoryIsNull).toBe(true)
      expect(snap.notFound).toBe(true)
      expect(snap.errorStatus).toBe(404)
      expect(snap.isLoading).toBe(false)
    })
  })
})
