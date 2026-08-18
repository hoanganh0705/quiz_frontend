

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { resetFilters } from '@/features/quizzes/store/use-quiz-filters-store'

const mockRouterReplace = vi.fn()
const mockRouterPush = vi.fn()
const mockUsePathname = vi.fn(() => '/quizzes')
const mockUseSearchParams = vi.fn(() => new URLSearchParams(''))

vi.mock('next/navigation', () => ({
useRouter: () => ({
replace: mockRouterReplace,
push: mockRouterPush,
back: vi.fn(),
forward: vi.fn(),
refresh: vi.fn(),
prefetch: vi.fn()
  }),
usePathname: () => mockUsePathname(),
useSearchParams: () => mockUseSearchParams()
}))

vi.mock('@/features/categories/hooks', () => ({
useCategoriesRanked: () => ({
categories: [],
isLoading: false,
error: null
  })
}))

vi.mock('@/features/tags/hooks', () => ({
useTagsPopular: () => ({
tags: [],
isLoading: false,
error: null
  })
}))

vi.mock('@/features/quizzes/hooks/useQuizzesPopular', () => ({
useQuizzesPopular: () => ({
quizzes: [],
isLoading: false,
error: null
  })
}))

vi.mock('@/features/quizzes/hooks/useQuizzesTrending', () => ({
useQuizzesTrending: () => ({
quizzes: [],
isLoading: false,
error: null
  })
}))

const mockUseQuizzesList = vi.fn()
vi.mock('@/features/quizzes/hooks/useQuizzesList', () => ({
useQuizzesList: (...args: unknown[]) => mockUseQuizzesList(...args)
}))

import { QuizzesDirectoryPage } from '@/features/quizzes/components/QuizzesDirectoryPage'

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
mockRouterReplace.mockReset()
mockRouterPush.mockReset()
mockUseQuizzesList.mockReset()
resetFilters()
})

afterEach(() => {
cleanup()
})

describe('QuizzesDirectoryPage — loading state', () => {
it('renders 20 skeletons when isLoading is true', () => {
mockUseQuizzesList.mockReturnValue({
items: [],
isLoading: true,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn()
    })

render(
<TestSwrProvider>
<QuizzesDirectoryPage />
</TestSwrProvider>
    )

const skeletons = screen.getAllByTestId('quiz-card-skeleton')
expect(skeletons).toHaveLength(20)
  })
})

describe('QuizzesDirectoryPage — success state', () => {
it('renders the grid and a load-more button when items are present', () => {
mockUseQuizzesList.mockReturnValue({
items: [
{
quizId: 'q-1',
slug: 'q-1',
title: 'Quiz One',
description: 'desc',
imageUrl: null,
isFeatured: false,
isVerified: false,
publishedVersionId: 'pv-1',
publishedVersion: { difficulty: 'easy' },
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
id: 'q-1'
        }
      ],
isLoading: false,
isLoadingMore: false,
hasMore: true,
loadMore: vi.fn(),
error: null,
refresh: vi.fn()
    })

render(
<TestSwrProvider>
<QuizzesDirectoryPage />
</TestSwrProvider>
    )

expect(screen.getByTestId('quizzes-directory-grid')).toBeInTheDocument()
expect(screen.getByTestId('quiz-grid-load-more-button')).toBeInTheDocument()
  })

it('does not render a load-more button when hasMore is false', () => {
mockUseQuizzesList.mockReturnValue({
items: [
{
quizId: 'q-1',
slug: 'q-1',
title: 'Quiz One',
description: null,
imageUrl: null,
isFeatured: false,
isVerified: false,
publishedVersionId: 'pv-1',
publishedVersion: null,
createdAt: '',
updatedAt: '',
id: 'q-1'
        }
      ],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn()
    })

render(
<TestSwrProvider>
<QuizzesDirectoryPage />
</TestSwrProvider>
    )

expect(screen.queryByTestId('quiz-grid-load-more-button')).not.toBeInTheDocument()
  })
})

describe('QuizzesDirectoryPage — directory empty (no active filters)', () => {
it('renders QuizGridEmpty with the "directory-empty" variant', async () => {
mockUseQuizzesList.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn()
    })

render(
<TestSwrProvider>
<QuizzesDirectoryPage />
</TestSwrProvider>
    )

await waitFor(() => {
const empty = screen.getByTestId('quiz-grid-empty')
expect(empty.dataset.variant).toBe('directory-empty')
    })
  })
})

describe('QuizzesDirectoryPage — filter no-match (active filters, zero results)', () => {
it('renders QuizGridEmpty with the "filters-no-match" variant and a Reset CTA', async () => {
mockUseQuizzesList.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn()
    })

render(
<TestSwrProvider>
<QuizzesDirectoryPage initialState={{ categoryId: 'cat-1' }} />
</TestSwrProvider>
    )

await waitFor(() => {
const empty = screen.getByTestId('quiz-grid-empty')
expect(empty.dataset.variant).toBe('filters-no-match')
    })

expect(screen.getByRole('button', { name: /reset filters/i })).toBeInTheDocument()
  })

it('clicking Reset filters clears the filter state', async () => {
mockUseQuizzesList.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn()
    })

const { useQuizFiltersStore } = await import(
'@/features/quizzes/store/use-quiz-filters-store'
    )

render(
<TestSwrProvider>
<QuizzesDirectoryPage initialState={{ categoryId: 'cat-1' }} />
</TestSwrProvider>
    )

await waitFor(() => {
expect(screen.getByTestId('quiz-grid-empty')).toBeInTheDocument()
    })

const resetButton = screen.getByRole('button', { name: /reset filters/i })
act(() => {
fireEvent.click(resetButton)
    })

expect(useQuizFiltersStore.getState().categoryId).toBeUndefined()
  })
})

describe('QuizzesDirectoryPage — missing-thumbnail gradient fallback', () => {
it('renders a deterministic gradient on the fallback element when imageUrl is null', () => {
const quizId = '0192f4d8-0000-7000-8000-000000000777'
mockUseQuizzesList.mockReturnValue({
items: [
{
quizId,
slug: 'gradient-quiz',
title: 'Gradient Quiz',
description: null,
imageUrl: null,
isFeatured: false,
isVerified: false,
publishedVersionId: null,
publishedVersion: undefined,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
id: quizId
        }
      ],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn()
    })

render(
<TestSwrProvider>
<QuizzesDirectoryPage />
</TestSwrProvider>
    )

const fallback = screen.getByTestId('quizzes-directory-card-fallback')
const style = (fallback as HTMLElement).getAttribute('style') ?? ''

expect(style).toMatch(/linear-gradient\(/)

expect(fallback.getAttribute('data-quiz-id')).toBe(quizId)
  })

it('the gradient is deterministic — two renders with the same quizId produce the same background', () => {
const quizId = '0192f4d8-0000-7000-8000-000000000888'
mockUseQuizzesList.mockReturnValue({
items: [
{
quizId,
slug: 'q-888',
title: 'Q888',
description: null,
imageUrl: null,
isFeatured: false,
isVerified: false,
publishedVersionId: null,
publishedVersion: undefined,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
id: quizId
        }
      ],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn()
    })

const { unmount } = render(
<TestSwrProvider>
<QuizzesDirectoryPage />
</TestSwrProvider>
    )

const firstStyle = (screen.getByTestId(
'quizzes-directory-card-fallback'
    ) as HTMLElement).getAttribute('style')

unmount()

render(
<TestSwrProvider>
<QuizzesDirectoryPage />
</TestSwrProvider>
    )

const secondStyle = (screen.getByTestId(
'quizzes-directory-card-fallback'
    ) as HTMLElement).getAttribute('style')

expect(firstStyle).toBeTruthy()
expect(secondStyle).toBeTruthy()
expect(firstStyle).toBe(secondStyle)
  })

it('does NOT render the fallback element when imageUrl is present', () => {
const quizId = '0192f4d8-0000-7000-8000-000000000999'
mockUseQuizzesList.mockReturnValue({
items: [
{
quizId,
slug: 'has-thumb',
title: 'Has Thumbnail',
description: null,
imageUrl: 'https://cdn.example.com/thumb.jpg',
isFeatured: false,
isVerified: false,
publishedVersionId: null,
publishedVersion: undefined,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
id: quizId
        }
      ],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn()
    })

render(
<TestSwrProvider>
<QuizzesDirectoryPage />
</TestSwrProvider>
    )

expect(
screen.queryByTestId('quizzes-directory-card-fallback')
    ).not.toBeInTheDocument()
  })
})
