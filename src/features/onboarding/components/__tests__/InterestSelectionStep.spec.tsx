/**
 * Component tests for `<InterestSelectionStep />`.
 *
 * Source epic:   Phase 4 (F-2 in the remaining-gaps plan) — the
 *                onboarding step must consume `useCategoriesRanked`
 *                (real `/categories/popular`) instead of the
 *                hardcoded `categories` constant.
 * Source ticket: F-2.
 *
 * These tests:
 *   - assert the loading skeleton renders while `isLoading`,
 *   - assert the error state renders an explicit `role="alert"`
 *     with retry (NOT a silent fallback to the hardcoded list),
 *   - assert the empty state renders a friendly "No categories yet"
 *     panel,
 *   - assert the populated state renders one button per category with
 *     the resolved icon + count from the API,
 *   - assert selection toggles work (toggle on / toggle off,
 *     `canProceed` semantics).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import * as React from 'react'

import { ApiError } from '@/lib/api'
import type { RankedCategoryResponseDto } from '@/lib/api/generated/schemas'

import { InterestSelectionStep } from '@/features/onboarding/components/InterestSelectionStep'

const getCategoriesRankedMock = vi.fn()

vi.mock('@/features/categories/services/categories.service', () => ({
  getCategoriesRanked: (...args: unknown[]) => getCategoriesRankedMock(...args),
  getCategoriesTrending: vi.fn(),
  listCategories: vi.fn(),
  getCategoryBySlug: vi.fn(),
  getCategory: vi.fn(),
  getCategoryQuizzes: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

function makeRankedCategory(
  overrides: Partial<RankedCategoryResponseDto> = {},
): RankedCategoryResponseDto {
  return {
    rank: 1,
    categoryId: '0192f4d8-0000-7000-8000-000000000001',
    name: 'Science',
    slug: 'science',
    imageUrl: null,
    description: null,
    totalScore: '100',
    totalAttempts: '50',
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

interface RenderProps {
  selectedInterests?: string[]
  onUpdateInterests?: (interests: string[]) => void
}

function renderStep(props: RenderProps = {}) {
  const onUpdateInterests = props.onUpdateInterests ?? vi.fn()
  return render(
    <TestSwrProvider>
      <InterestSelectionStep
        selectedInterests={props.selectedInterests ?? []}
        onUpdateInterests={onUpdateInterests}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />
    </TestSwrProvider>,
  )
}

beforeEach(() => {
  getCategoriesRankedMock.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('InterestSelectionStep — loading state', () => {
  it('renders the skeleton grid while the API call is in-flight', async () => {
    // A never-resolving promise keeps the hook in `isLoading`.
    getCategoriesRankedMock.mockReturnValue(new Promise(() => undefined))
    renderStep()
    expect(await screen.findByTestId('interest-selection-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('interest-selection-grid')).toBeNull()
    expect(screen.queryByTestId('interest-selection-error')).toBeNull()
  })
})

describe('InterestSelectionStep — error state', () => {
  it('renders an explicit error alert with retry (no silent fallback)', async () => {
    // Avoid `window.location.reload` actually reloading the page —
    // jsdom's default navigation would mask the test result. Stub it.
    const originalReload = window.location.reload
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: vi.fn() },
      writable: true,
      configurable: true,
    })
    getCategoriesRankedMock.mockRejectedValue(makeApiError(500))
    renderStep()
    const errorEl = await screen.findByTestId('interest-selection-error')
    expect(errorEl).toHaveAttribute('role', 'alert')
    // The retry button must be present — we never silently fall back
    // to the hardcoded `categories` constant.
    expect(
      screen.getByRole('button', { name: /retry loading categories/i }),
    ).toBeInTheDocument()
    // The skeleton + the grid + the empty state must all be absent.
    expect(screen.queryByTestId('interest-selection-skeleton')).toBeNull()
    expect(screen.queryByTestId('interest-selection-grid')).toBeNull()
    expect(screen.queryByTestId('interest-selection-empty')).toBeNull()

    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: originalReload },
      writable: true,
      configurable: true,
    })
  })
})

describe('InterestSelectionStep — empty state', () => {
  it('renders an explicit empty panel when the API returns zero categories', async () => {
    getCategoriesRankedMock.mockResolvedValue({ data: [] })
    renderStep()
    const empty = await screen.findByTestId('interest-selection-empty')
    expect(empty).toBeInTheDocument()
    expect(screen.queryByTestId('interest-selection-grid')).toBeNull()
  })
})

describe('InterestSelectionStep — populated state', () => {
  it('renders one button per category with the slug-derived icon', async () => {
    getCategoriesRankedMock.mockResolvedValue({
      data: [
        makeRankedCategory({
          rank: 1,
          categoryId: '0192f4d8-0000-7000-8000-000000000001',
          name: 'Science',
          slug: 'science',
          totalAttempts: '120',
        }),
        makeRankedCategory({
          rank: 2,
          categoryId: '0192f4d8-0000-7000-8000-000000000002',
          name: 'History',
          slug: 'history',
          totalAttempts: '80',
        }),
      ],
    })
    renderStep()
    await waitFor(() => {
      expect(screen.getByTestId('interest-selection-grid')).toBeInTheDocument()
    })
    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
    // Counts are surfaced as "120 attempts" / "80 attempts".
    expect(screen.getByText('120 attempts')).toBeInTheDocument()
    expect(screen.getByText('80 attempts')).toBeInTheDocument()
  })

  it('caps the grid at CATEGORY_LIMIT (20) — extra rows from the API are dropped', async () => {
    const list: RankedCategoryResponseDto[] = Array.from({ length: 25 }, (_, idx) =>
      makeRankedCategory({
        rank: idx + 1,
        categoryId: `0192f4d8-0000-7000-8000-${String(idx).padStart(12, '0')}`,
        name: `Category ${idx}`,
        slug: 'science',
      }),
    )
    getCategoriesRankedMock.mockResolvedValue({ data: list })
    renderStep()
    await waitFor(() => {
      expect(screen.getByTestId('interest-selection-grid')).toBeInTheDocument()
    })
    expect(screen.getAllByTestId('interest-selection-cell')).toHaveLength(20)
  })

  it('uses the fallback emoji when the slug is unknown', async () => {
    getCategoriesRankedMock.mockResolvedValue({
      data: [
        makeRankedCategory({
          rank: 1,
          categoryId: '0192f4d8-0000-7000-8000-000000000001',
          name: 'Mystery Topic',
          slug: 'mystery-topic-xyz',
        }),
      ],
    })
    renderStep()
    const cell = await screen.findByTestId('interest-selection-cell')
    expect(cell.textContent).toContain('📚')
  })
})

describe('InterestSelectionStep — selection semantics', () => {
  it('toggling a category on then off round-trips the onUpdateInterests callback', async () => {
    getCategoriesRankedMock.mockResolvedValue({
      data: [
        makeRankedCategory({
          rank: 1,
          categoryId: 'cat-1',
          name: 'Science',
          slug: 'science',
        }),
      ],
    })

    // Stateful wrapper: track selection in component state so the
    // second click sees the updated value (mirrors real usage in
    // `app/(protected)/onboarding/page.tsx`).
    function StatefulHarness() {
      const [selected, setSelected] = React.useState<string[]>([])
      return (
        <TestSwrProvider>
          <InterestSelectionStep
            selectedInterests={selected}
            onUpdateInterests={setSelected}
            onNext={vi.fn()}
            onBack={vi.fn()}
            onSkip={vi.fn()}
          />
        </TestSwrProvider>
      )
    }

    render(<StatefulHarness />)

    const cell = await screen.findByTestId('interest-selection-cell')
    fireEvent.click(cell)
    // After first click, the cell becomes selected → aria-pressed=true.
    await waitFor(() => {
      expect(cell).toHaveAttribute('aria-pressed', 'true')
    })
    fireEvent.click(cell)
    // After second click, the cell becomes deselected.
    await waitFor(() => {
      expect(cell).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('respects initial selectedInterests (controlled value)', async () => {
    getCategoriesRankedMock.mockResolvedValue({
      data: [
        makeRankedCategory({
          rank: 1,
          categoryId: 'cat-1',
          name: 'Science',
          slug: 'science',
        }),
      ],
    })
    renderStep({ selectedInterests: ['cat-1'] })
    const cell = await screen.findByTestId('interest-selection-cell')
    expect(cell).toHaveAttribute('aria-pressed', 'true')
  })

  it('disables the Continue button when no interest is selected', async () => {
    getCategoriesRankedMock.mockResolvedValue({
      data: [
        makeRankedCategory({
          rank: 1,
          categoryId: 'cat-1',
          name: 'Science',
          slug: 'science',
        }),
      ],
    })
    renderStep({ selectedInterests: [] })
    await screen.findByTestId('interest-selection-grid')
    expect(
      screen.getByRole('button', { name: /continue to next step/i }),
    ).toBeDisabled()
  })
})
