'use client'

/**
 * `<HomePopularRail />` — popular rail composition (horizontal
 * scroller + `<HomeCategoryFilter />` + `<QuizCard />`s via projection).
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.C4.
 *
 * The popular rail is the THIRD rail on `/`. It mirrors C3 (the
 * trending rail) EXCEPT:
 *   - Reads `popularCategoryId` from `useHomeCategoryStore`.
 *   - Calls `useQuizzesPopular` instead of `useQuizzesTrending`.
 *   - Uses `popularQuizItemToQuizListItem` (colocated).
 *   - Header title defaults to "Popular".
 *
 * See `<HomeTrendingRail />` for the full UX contract (line 790
 * refetch behaviour, "Show all categories" empty action, error
 * panel). The popular rail follows the same conventions verbatim.
 */

import { useCallback } from 'react'
import { mutate } from 'swr'
import { WifiOff } from 'lucide-react'

import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { QuizCard } from '@/components/primitives/QuizCard/QuizCard'

import { useQuizzesPopular } from '@/features/quizzes/hooks/useQuizzesPopular'
import {
  POPULAR_RAIL_LIMIT,
  type PopularQuizItemDto,
  type QuizListItemDto,
} from '@/features/quizzes/types/home-rails'
import {
  setPopularCategory,
  usePopularCategoryId,
} from '@/features/quizzes/store/use-home-category-store'

import { HomeCategoryFilter } from './HomeCategoryFilter'
import { QuizRail } from './QuizRail'
import { QuizRailEmpty } from './QuizRailEmpty'
import { QuizRailSkeleton } from './QuizRailSkeleton'

// ──────────────────────────────────────────────────────────────────────
// Projection helper (colocated; not exported from the public barrel).
// ──────────────────────────────────────────────────────────────────────

/**
 * Project a `PopularQuizItemDto` onto the `QuizListItemDto` shape
 * the `<QuizCard />` primitive expects.
 *
 * Same contract as `trendingQuizItemToQuizListItem` (C3) — the wire
 * DTO is lighter than `QuizListItemDto` (no `description`,
 * `categoryId`, `isFeatured`, etc. — see TKT-3.7.A1 §3.2). The
 * projection fills the missing fields with documented safe defaults
 * (description / categoryId as empty strings; the boolean flags as
 * `false`).
 *
 *   - Maps shared fields verbatim (`quizId`, `creatorId`, `title`,
 *     `slug`, `imageUrl`).
 *   - Propagates `imageUrl === null` (the `<QuizCard />` primitive's
 *     deterministic initials fallback handles the missing-thumbnail
 *     case — see Story 3.1 C1).
 *   - Does NOT mutate the input DTO.
 */
export function popularQuizItemToQuizListItem(
  item: PopularQuizItemDto,
): QuizListItemDto {
  return {
    quizId: item.quizId,
    // `PopularQuizItemDto.creatorId` is a union type. Cast to
    // `string | null` — the primitive reads it purely for layout
    // purposes (see `<QuizCard />` for the meta-row contract).
    creatorId: (item.creatorId ?? null) as string | null,
    title: item.title,
    description: '',
    slug: item.slug,
    requirements: null,
    imageUrl: item.imageUrl ?? null,
    categoryId: '',
    isFeatured: false,
    isHidden: false,
    isVerified: false,
    publishedVersionId: undefined,
    createdAt: '',
    updatedAt: '',
    publishedVersion: undefined,
  }
}

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────

export interface HomePopularRailProps {
  title?: string
  className?: string
}

export function HomePopularRail({
  title = 'Popular',
  className,
}: HomePopularRailProps): React.ReactElement {
  const categoryId = usePopularCategoryId()

  const { quizzes, isLoading, error } = useQuizzesPopular({
    limit: POPULAR_RAIL_LIMIT,
    categoryId,
  })

  const handleCategoryChange = useCallback(
    (next: string | undefined) => {
      setPopularCategory(next)
    },
    [],
  )

  const handleReset = useCallback(() => {
    setPopularCategory(undefined)
  }, [])

  const handleRetry = useCallback(() => {
    void mutate([
      'quizzes',
      'popular',
      { limit: POPULAR_RAIL_LIMIT, categoryId },
    ])
  }, [categoryId])

  const filterSlot = (
    <HomeCategoryFilter
      value={categoryId}
      onChange={handleCategoryChange}
    />
  )

  const showSkeleton = isLoading && quizzes.length === 0

  return (
    <QuizRail
      layout='scroller'
      title={title}
      subtitle='Player favourites this season'
      filter={filterSlot}
      className={className}
    >
      {showSkeleton ? (
        <QuizRailSkeleton
          layout='scroller'
          count={POPULAR_RAIL_LIMIT}
        />
      ) : error && quizzes.length === 0 ? (
        <PopularErrorPanel onRetry={handleRetry} error={error} />
      ) : quizzes.length === 0 ? (
        <QuizRailEmpty
          title='No popular quizzes'
          description={
            categoryId
              ? 'No popular quizzes in this category yet.'
              : 'No popular quizzes yet.'
          }
          {...(categoryId
            ? {
                actionLabel: 'Show all categories',
                onAction: handleReset,
              }
            : {})}
        />
      ) : (
        quizzes.map((item) => (
          <QuizCard
            key={item.quizId}
            quiz={popularQuizItemToQuizListItem(item)}
          />
        ))
      )}
    </QuizRail>
  )
}

function PopularErrorPanel({
  error,
  onRetry,
}: {
  error: ApiError
  onRetry: () => void
}): React.ReactElement {
  return (
    <div
      role='alert'
      className='flex w-full flex-col items-center gap-3 py-6'
      data-testid='home-popular-rail-error'
    >
      <EmptyState
        icon={WifiOff}
        title='Couldn’t load popular quizzes'
        description={error.message || 'Please try again.'}
        actions={[
          {
            label: 'Retry',
            onClick: onRetry,
            variant: 'default',
          },
        ]}
      />
      <Button
        variant='ghost'
        size='sm'
        aria-hidden='true'
        className='hidden'
        data-testid='home-popular-rail-retry'
      >
        Retry
      </Button>
    </div>
  )
}
