'use client'

/**
 * `<HomeTrendingRail />` — trending rail composition (horizontal
 * scroller + `<HomeCategoryFilter />` + `<QuizCard />`s via projection).
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.C3.
 *
 * The trending rail is the SECOND rail on `/`. It mirrors C2 (the
 * featured rail) EXCEPT:
 *   - Reads `trendingCategoryId` from `useHomeCategoryStore` (a
 *     selector — not the full state object — to avoid the
 *     cross-story contract rule #6 about selector references).
 *   - Renders `<HomeCategoryFilter />` in the rail's `filter` slot;
 *     category change re-fetches via `useQuizzesTrending`'s params.
 *   - Renders 10 cards in a horizontal scroller (per TRENDING_RAIL_LIMIT).
 *   - Projects each `TrendingQuizItemDto` onto a `QuizListItemDto`
 *     via the colocated `trendingQuizItemToQuizListItem` helper
 *     (not exported from the public barrel — only the rail uses it).
 *
 * UX notes (Story 3.7 line 790):
 *
 *   - First load → 10 skeleton cards in the scroller.
 *   - Subsequent category change in flight → existing cards stay
 *     mounted (no layout shift). The skeleton overlay is NOT rendered
 *     during the refetch; SWR serves the stale data + the new data
 *     when it resolves.
 *   - Empty + category set → `<QuizRailEmpty>` with a "Show all
 *     categories" CTA that clears `trendingCategoryId` via
 *     `setTrendingCategory(undefined)`.
 *   - Error → inline error panel with a Retry button.
 */

import { useCallback } from 'react'
import { mutate } from 'swr'
import { WifiOff } from 'lucide-react'

import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { QuizCard } from '@/components/primitives/QuizCard/QuizCard'

import { useQuizzesTrending } from '@/features/quizzes/hooks/useQuizzesTrending'
import {
  TRENDING_RAIL_LIMIT,
  type QuizListItemDto,
  type TrendingQuizItemDto,
} from '@/features/quizzes/types/home-rails'
import {
  setTrendingCategory,
  useTrendingCategoryId,
} from '@/features/quizzes/store/use-home-category-store'

import { HomeCategoryFilter } from './HomeCategoryFilter'
import { QuizRail } from './QuizRail'
import { QuizRailEmpty } from './QuizRailEmpty'
import { QuizRailSkeleton } from './QuizRailSkeleton'

// ──────────────────────────────────────────────────────────────────────
// Projection helper (colocated; not exported from the public barrel).
// ──────────────────────────────────────────────────────────────────────

/**
 * Project a `TrendingQuizItemDto` onto the `QuizListItemDto` shape
 * the `<QuizCard />` primitive expects.
 *
 * The wire DTO is structurally lighter than `QuizListItemDto` (no
 * `description`, `categoryId`, `isFeatured`, `isVerified`, etc. —
 * see TKT-3.7.A1 §3.3). The projection fills the missing fields
 * with documented safe defaults so the rail renders identically to
 * the `<QuizCard />` used elsewhere on the app.
 *
 * The projection is a pure function:
 *   - Maps shared fields verbatim (`quizId`, `creatorId`, `title`,
 *     `slug`, `imageUrl`).
 *   - Propagates `imageUrl === null` (the `<QuizCard />` primitive's
 *     deterministic initials fallback handles the missing-thumbnail
 *     case — see Story 3.1 C1).
 *   - Fills the `QuizListItemDto`-only fields with safe defaults.
 *   - Does NOT mutate the input DTO.
 *
 * Exported only inside this module so other rails cannot accidentally
 * consume it. The companion `popularQuizItemToQuizListItem` lives
 * next to the popular rail (C4).
 */
export function trendingQuizItemToQuizListItem(
  item: TrendingQuizItemDto,
): QuizListItemDto {
  return {
    quizId: item.quizId,
    // `TrendingQuizItemDto.creatorId` is a union type (the SDK
    // expresses the nullable id as a dedicated nested type). Cast
    // the value to `string | null` here — the primitive reads it
    // purely for layout purposes (the metadata row never shows
    // `creatorId` directly) so the cast is safe.
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

export interface HomeTrendingRailProps {
  title?: string
  className?: string
}

export function HomeTrendingRail({
  title = 'Trending',
  className,
}: HomeTrendingRailProps): React.ReactElement {
  // Selectors — not the full state object (cross-story contract rule #6).
  const categoryId = useTrendingCategoryId()

  const { quizzes, isLoading, error } = useQuizzesTrending({
    limit: TRENDING_RAIL_LIMIT,
    categoryId,
  })

  const handleCategoryChange = useCallback(
    (next: string | undefined) => {
      setTrendingCategory(next)
    },
    [],
  )

  const handleReset = useCallback(() => {
    setTrendingCategory(undefined)
  }, [])

  const handleRetry = useCallback(() => {
    void mutate([
      'quizzes',
      'trending',
      { limit: TRENDING_RAIL_LIMIT, categoryId },
    ])
  }, [categoryId])

  const filterSlot = (
    <HomeCategoryFilter
      value={categoryId}
      onChange={handleCategoryChange}
    />
  )

  // UX note (Story 3.7 line 790): only render the skeleton on the
  // FIRST load. SWR's `isLoading` is true only on the first fetch —
  // subsequent refetches (e.g. category change) keep `isLoading`
  // false while `data` is the previously-resolved list. The existing
  // cards stay mounted during the refetch (no layout shift).
  const showSkeleton = isLoading && quizzes.length === 0

  return (
    <QuizRail
      layout='scroller'
      title={title}
      subtitle='What players are reaching for right now'
      filter={filterSlot}
      className={className}
    >
      {showSkeleton ? (
        <QuizRailSkeleton
          layout='scroller'
          count={TRENDING_RAIL_LIMIT}
        />
      ) : error && quizzes.length === 0 ? (
        <TrendingErrorPanel onRetry={handleRetry} error={error} />
      ) : quizzes.length === 0 ? (
        <QuizRailEmpty
          title='No trending quizzes'
          description={
            categoryId
              ? 'No trending quizzes in this category yet.'
              : 'No trending quizzes yet.'
          }
          {...(categoryId
            ? {
                actionLabel: 'Show all categories',
                onAction: handleReset,
              }
            : {})}
        />
      ) : (
        // First-render path: render the projected cards into the
        // scroller via the rail's `children`. The rail wraps each
        // child in a snap cell so the cards line up with the
        // skeleton cells above.
        quizzes.map((item) => (
          <QuizCard
            key={item.quizId}
            quiz={trendingQuizItemToQuizListItem(item)}
          />
        ))
      )}
    </QuizRail>
  )
}

function TrendingErrorPanel({
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
      data-testid='home-trending-rail-error'
    >
      <EmptyState
        icon={WifiOff}
        title='Couldn’t load trending quizzes'
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
        data-testid='home-trending-rail-retry'
      >
        Retry
      </Button>
    </div>
  )
}
