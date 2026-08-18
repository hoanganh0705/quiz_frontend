

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
cleanup,
fireEvent,
render,
screen,
waitFor,
within,
} from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'
import type {
CategoryResponseDto,
QuizListItemDto,
RankedCategoryResponseDto,
} from '@/lib/api/generated/schemas'

vi.mock('next/link', () => ({
default: ({
href,
children,
...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
href: string
children: React.ReactNode
  }) => (
<a href={href} {...rest}>
{children}
</a>
  ),
}))

const useCategoriesTrendingMock = vi.fn()
const useCategoriesRankedMock = vi.fn()
const useCategoryMock = vi.fn()
const useCategoryQuizzesMock = vi.fn()

vi.mock('@/features/categories/hooks', () => ({
useCategoriesRanked: () => useCategoriesRankedMock(),
useCategoriesTrending: () => useCategoriesTrendingMock(),
useCategory: (idOrSlug: string) => useCategoryMock(idOrSlug),
useCategoryQuizzes: (idOrSlug: string, params: unknown) =>
useCategoryQuizzesMock(idOrSlug, params),
}))

vi.mock('@/features/marketing', () => ({
HowItWorks: () => <div data-testid='mock-how-it-works' />,
}))

const UUID = (i: number) =>
`0192f4d8-0000-7000-8000-${String(i).padStart(12, '0')}`

function makeCategoryResponse(
overrides: Partial<CategoryResponseDto> = {},
): CategoryResponseDto {
return {
categoryId: UUID(1),
name: 'Mathematics',
description: 'All math quizzes.',
slug: 'mathematics',
imageUrl: null,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
...overrides,
  }
}

function makeRankedCategory(
overrides: Partial<RankedCategoryResponseDto> = {},
): RankedCategoryResponseDto {
return {
rank: 1,
categoryId: UUID(1),
name: 'Mathematics',
slug: 'mathematics',
imageUrl: null,
description: null,
totalScore: '100',
totalAttempts: '50',
...overrides,
  }
}

function makeQuiz(overrides: Partial<QuizListItemDto> = {}): QuizListItemDto {
return {
quizId: UUID(1),
creatorId: null,
creator: {
userId: UUID(2),
username: 'testuser',
displayName: 'Test User',
avatarUrl: null,
    },
title: 'Sample quiz',
description: null,
slug: 'sample-quiz',
requirements: null,
imageUrl: null,
categoryId: UUID(1),
categoryName: null,
categorySlug: null,
isFeatured: false,
isHidden: false,
isVerified: true,
publishedVersionId: null,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
questionCount: 10,
averageRating: 4.0,
reviewCount: 5,
attemptCount: 50,
tags: [],
...overrides,
  }
}

function makeApiError(status: number, code = 'INTERNAL'): ApiError {
return new ApiError({
config: undefined,
request: undefined,
response: { status, data: { code, detail: 'fixture' } },
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

afterEach(() => {
cleanup()
useCategoriesTrendingMock.mockReset()
useCategoriesRankedMock.mockReset()
useCategoryMock.mockReset()
useCategoryQuizzesMock.mockReset()
})

import { TrendingCategoriesStrip } from '@/features/categories/components/TrendingCategoriesStrip'
import { CategoryQuizGrid } from '@/features/categories/components/CategoryQuizGrid'
import { CategoriesDirectoryPage } from '@/features/categories/components/CategoriesDirectoryPage'
import { CategoryDetailPage } from '@/features/categories/components/CategoryDetailPage'

describe('TrendingCategoriesStrip', () => {
it('renders 5 skeletons on loading and 10 cards on success', async () => {

useCategoriesTrendingMock.mockReturnValueOnce({
categories: [],
isLoading: true,
error: null,
    })

const { rerender } = render(
<TestSwrProvider>
<TrendingCategoriesStrip />
</TestSwrProvider>,
    )

const loadingSkeletons = screen.getAllByTestId('trending-strip-skeleton')
expect(loadingSkeletons.length).toBe(5)

useCategoriesTrendingMock.mockReturnValueOnce({
categories: Array.from({ length: 10 }, (_, i) =>
makeRankedCategory({
rank: i + 1,
categoryId: UUID(i + 1),
name: `Trending ${i + 1}`,
slug: `trending-${i + 1}`,
        }),
      ),
isLoading: false,
error: null,
    })

rerender(
<TestSwrProvider>
<TrendingCategoriesStrip />
</TestSwrProvider>,
    )

await waitFor(() => {
expect(
screen.getByTestId('trending-strip'),
      ).toBeInTheDocument()
    })
const cards = screen.getAllByTestId('category-card')
expect(cards.length).toBe(10)
  })
})

describe('CategoryQuizGrid', () => {
it('renders 12 skeletons on loading', () => {
useCategoryQuizzesMock.mockReturnValue({
items: [],
isLoading: true,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn(),
retryBannerVisible: false,
    })

render(
<TestSwrProvider>
<CategoryQuizGrid idOrSlug='mathematics' />
</TestSwrProvider>,
    )

const skeletons = screen.getAllByTestId('quiz-card-skeleton')
expect(skeletons.length).toBe(12)
  })

it('renders grid + load-more button on success-with-hasMore', () => {
const loadMore = vi.fn()
useCategoryQuizzesMock.mockReturnValue({
items: [
makeQuiz({ quizId: UUID(1), title: 'Algebra 101' }),
makeQuiz({ quizId: UUID(2), title: 'Calculus 101' }),
      ],
isLoading: false,
isLoadingMore: false,
hasMore: true,
loadMore,
error: null,
refresh: vi.fn(),
retryBannerVisible: false,
    })

render(
<TestSwrProvider>
<CategoryQuizGrid idOrSlug='mathematics' />
</TestSwrProvider>,
    )

const cards = screen.getAllByTestId('quiz-card')
expect(cards.length).toBe(2)
const loadMoreBtn = screen.getByTestId('category-quiz-grid-load-more')
expect(loadMoreBtn).toBeInTheDocument()
loadMoreBtn.click()
expect(loadMore).toHaveBeenCalled()
  })

it('renders CategoryEmptyState when items is empty and not loading', () => {
useCategoryQuizzesMock.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn(),
retryBannerVisible: false,
    })

render(
<TestSwrProvider>
<CategoryQuizGrid idOrSlug='mathematics' />
</TestSwrProvider>,
    )

expect(
screen.getByTestId('category-quiz-grid-empty'),
    ).toBeInTheDocument()
expect(
screen.getByTestId('category-empty-state-quizzes-in-category'),
    ).toBeInTheDocument()
  })
})

describe('CategoriesDirectoryPage', () => {
it('renders 9 skeletons on loading', () => {
useCategoriesRankedMock.mockReturnValue({
categories: [],
isLoading: true,
error: null,
    })
useCategoriesTrendingMock.mockReturnValue({
categories: [],
isLoading: false,
error: null,
    })

render(
<TestSwrProvider>
<CategoriesDirectoryPage />
</TestSwrProvider>,
    )

const skeletons = screen.getAllByTestId('category-card-skeleton')
expect(skeletons.length).toBe(9)
  })

it('renders the grid + retry button on error', () => {
useCategoriesRankedMock.mockReturnValue({
categories: [],
isLoading: false,
error: makeApiError(500),
    })
useCategoriesTrendingMock.mockReturnValue({
categories: [],
isLoading: false,
error: null,
    })

render(
<TestSwrProvider>
<CategoriesDirectoryPage />
</TestSwrProvider>,
    )

expect(
screen.getByTestId('categories-directory-error'),
    ).toBeInTheDocument()
expect(screen.getByTestId('categories-directory-retry')).toBeInTheDocument()
  })

it('renders CategoryEmptyState when ranked is empty', () => {
useCategoriesRankedMock.mockReturnValue({
categories: [],
isLoading: false,
error: null,
    })
useCategoriesTrendingMock.mockReturnValue({
categories: [],
isLoading: false,
error: null,
    })

render(
<TestSwrProvider>
<CategoriesDirectoryPage />
</TestSwrProvider>,
    )

expect(
screen.getByTestId('category-empty-state-directory'),
    ).toBeInTheDocument()
  })

it('renders the trending strip above the grid', () => {
useCategoriesRankedMock.mockReturnValue({
categories: [
makeRankedCategory({ rank: 1, categoryId: UUID(1) }),
makeRankedCategory({
rank: 2,
categoryId: UUID(2),
name: 'Science',
slug: 'science',
        }),
      ],
isLoading: false,
error: null,
    })
useCategoriesTrendingMock.mockReturnValue({
categories: [
makeRankedCategory({
rank: 1,
categoryId: UUID(10),
name: 'Trending Here',
slug: 'trending-here',
        }),
      ],
isLoading: false,
error: null,
    })

render(
<TestSwrProvider>
<CategoriesDirectoryPage />
</TestSwrProvider>,
    )

const page = screen.getByTestId('categories-directory-page')
const strip = screen.getByTestId('trending-strip')
const grid = screen.getByTestId('categories-directory-grid')

const position = page.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING
expect(position).toBeTruthy()
expect(position).toBeGreaterThan(0)

expect(grid).toBeInTheDocument()

const gridCards = within(grid).getAllByTestId('category-card')
expect(gridCards.length).toBe(2)
  })
})

describe('CategoriesDirectoryPage — search input (E1)', () => {
it('filters the grid by name when the user types a query', async () => {
useCategoriesRankedMock.mockReturnValue({
categories: [
makeRankedCategory({
rank: 1,
categoryId: UUID(1),
name: 'Science',
slug: 'science',
        }),
makeRankedCategory({
rank: 2,
categoryId: UUID(2),
name: 'Mathematics',
slug: 'mathematics',
        }),
makeRankedCategory({
rank: 3,
categoryId: UUID(3),
name: 'History',
slug: 'history',
        }),
      ],
isLoading: false,
error: null,
    })
useCategoriesTrendingMock.mockReturnValue({
categories: [],
isLoading: false,
error: null,
    })

render(
<TestSwrProvider>
<CategoriesDirectoryPage />
</TestSwrProvider>,
    )

const input = screen.getByTestId('categories-directory-search-input')
expect(input).toBeInTheDocument()
expect(input).toHaveAttribute('aria-label', 'Search quiz categories')
expect(input).toHaveAttribute('placeholder', 'Search categories…')
expect(input).toHaveAttribute('autocomplete', 'off')
expect(input).toHaveAttribute('spellcheck', 'false')

expect(
screen.getAllByTestId('category-card').length,
    ).toBe(3)

fireEvent.change(input, { target: { value: 'math' } })

await waitFor(() => {
const cards = screen.getAllByTestId('category-card')
expect(cards.length).toBe(1)
    })
  })

it('renders the search-specific empty state when the query has zero matches', async () => {
useCategoriesRankedMock.mockReturnValue({
categories: [
makeRankedCategory({
rank: 1,
categoryId: UUID(1),
name: 'Science',
slug: 'science',
        }),
      ],
isLoading: false,
error: null,
    })
useCategoriesTrendingMock.mockReturnValue({
categories: [],
isLoading: false,
error: null,
    })

render(
<TestSwrProvider>
<CategoriesDirectoryPage />
</TestSwrProvider>,
    )

const input = screen.getByTestId('categories-directory-search-input')
fireEvent.change(input, { target: { value: 'xyz-no-match' } })

await waitFor(() => {
expect(
screen.getByTestId('categories-directory-search-empty'),
      ).toBeInTheDocument()
expect(screen.getByText(/no categories found matching your search/i)).toBeInTheDocument()
    })

expect(
screen.queryByTestId('category-empty-state-directory'),
    ).not.toBeInTheDocument()
  })
})

describe('CategoryDetailPage', () => {
it('renders header skeleton + grid skeleton on loading', () => {
useCategoryMock.mockReturnValue({
category: null,
isLoading: true,
error: null,
notFound: false,
    })
useCategoryQuizzesMock.mockReturnValue({
items: [],
isLoading: true,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn(),
retryBannerVisible: false,
    })

render(
<TestSwrProvider>
<CategoryDetailPage idOrSlug='mathematics' />
</TestSwrProvider>,
    )

expect(
screen.getByTestId('category-detail-page-loading'),
    ).toBeInTheDocument()
expect(screen.getByTestId('category-header')).toBeInTheDocument()
const skeletons = screen.getAllByTestId('quiz-card-skeleton')
expect(skeletons.length).toBe(12)
  })

it('renders header + grid on success', () => {
useCategoryMock.mockReturnValue({
category: makeCategoryResponse({ name: 'Mathematics' }),
isLoading: false,
error: null,
notFound: false,
    })
useCategoryQuizzesMock.mockReturnValue({
items: [
makeQuiz({ quizId: UUID(1), title: 'Algebra 101' }),
      ],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn(),
retryBannerVisible: false,
    })

render(
<TestSwrProvider>
<CategoryDetailPage idOrSlug='mathematics' />
</TestSwrProvider>,
    )

expect(
screen.getByTestId('category-detail-page'),
    ).toBeInTheDocument()
expect(
screen.getByRole('heading', { name: /mathematics/i }),
    ).toBeInTheDocument()
expect(screen.getByTestId('category-quiz-grid')).toBeInTheDocument()
  })

it('renders the 404 block when notFound is true', () => {
useCategoryMock.mockReturnValue({
category: null,
isLoading: false,
error: makeApiError(404, 'CATEGORY_NOT_FOUND'),
notFound: true,
    })
useCategoryQuizzesMock.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn(),
retryBannerVisible: false,
    })

render(
<TestSwrProvider>
<CategoryDetailPage idOrSlug='mathematics' />
</TestSwrProvider>,
    )

expect(
screen.getByTestId('category-detail-page-not-found'),
    ).toBeInTheDocument()
expect(screen.getByText(/category not found/i)).toBeInTheDocument()
  })

it('renders the error block + retry button on 5xx', () => {
useCategoryMock.mockReturnValue({
category: null,
isLoading: false,
error: makeApiError(500),
notFound: false,
    })
useCategoryQuizzesMock.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn(),
retryBannerVisible: false,
    })

render(
<TestSwrProvider>
<CategoryDetailPage idOrSlug='mathematics' />
</TestSwrProvider>,
    )

expect(
screen.getByTestId('category-detail-page-server-error'),
    ).toBeInTheDocument()
expect(screen.getByTestId('category-detail-page-retry')).toBeInTheDocument()
  })
})

describe('CategoryDetailPage — breadcrumb (F1)', () => {
it('renders the breadcrumb with the canonical slug link', () => {
useCategoryMock.mockReturnValue({
category: makeCategoryResponse({
name: 'Mathematics',
slug: 'mathematics',
      }),
isLoading: false,
error: null,
notFound: false,
    })
useCategoryQuizzesMock.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn(),
retryBannerVisible: false,
    })

render(
<TestSwrProvider>
<CategoryDetailPage idOrSlug='0192f4d8-0000-7000-8000-000000000abc' />
</TestSwrProvider>,
    )

const breadcrumb = screen.getByTestId('category-detail-page-breadcrumb')
expect(breadcrumb).toBeInTheDocument()

const slugLink = within(breadcrumb).getByRole('link', {
name: /mathematics/i,
    })
expect(slugLink).toHaveAttribute('href', '/categories/mathematics')

const categoriesLink = within(breadcrumb).getByRole('link', {
name: /categories/i,
    })
expect(categoriesLink).toHaveAttribute('href', '/categories')

const homeLink = within(breadcrumb).getByRole('link', { name: /home/i })
expect(homeLink).toHaveAttribute('href', '/')
  })
})
