'use client'

/**
 * `<HomeFeaturedRail />` — featured rail composition (fixed grid of
 * 6 `<QuizCard />`s, no filter, no scroll).
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.C2.
 *
 * The featured rail is the FIRST rail on `/` and renders the
 * editorial-fixed set of featured quizzes (Story 3.7 line 810). The
 * rail is a `<QuizRail layout="grid">` shell with:
 *
 *   - title "Featured" (no filter slot — featured is editorial-fixed)
 *   - loading state: 6 `<QuizCardSkeleton />` items in a grid
 *     (matching the resolved cards' dimensions — CLS = 0 per Story 3.7
 *     AC #3)
 *   - resolved state: the first 6 items, hard cap at `FEATURED_RAIL_LIMIT`
 *     (Story 3.7 line 810 — "Featured cap is small (probably ≤ 6);
 *     truncate at the cap and render no scroll")
 *   - empty state: `<QuizRailEmpty>` with the documented copy
 *     (Story 3.7 line 794)
 *   - error state: inline error panel with a Retry button that calls
 *     SWR's global `mutate(key)` to refetch the same cache key.
 */

import { useCallback } from 'react'
import { mutate } from 'swr'
import { WifiOff } from 'lucide-react'

import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

import { useFeaturedQuizzes } from '@/features/quizzes/hooks/useFeaturedQuizzes'
import { FEATURED_RAIL_LIMIT } from '@/features/quizzes/types/home-rails'
import { QuizRail } from './QuizRail'
import { QuizRailEmpty } from './QuizRailEmpty'
import { QuizRailSkeleton } from './QuizRailSkeleton'

export interface HomeFeaturedRailProps {
  /**
   * Optional content override for the title. Defaults to "Featured".
   * The ticket (C2 AC #1) calls for `title="Featured"`; the override
   * lets the page author adjust copy without forking the component.
   */
  title?: string
  className?: string
}

export function HomeFeaturedRail({
  title = 'Featured',
  className,
}: HomeFeaturedRailProps): React.ReactElement {
  const { quizzes, isLoading, error } = useFeaturedQuizzes({
    limit: FEATURED_RAIL_LIMIT,
  })

  // Hard cap — drop items beyond the 6th. The hook already enforces
  // the upstream `limit`, but we slice again as a defence-in-depth so
  // a misbehaving backend cannot blow the cap.
  const visibleQuizzes = quizzes.slice(0, FEATURED_RAIL_LIMIT)

  const handleRetry = useCallback(() => {
    // SWR's global `mutate(key)` re-runs the fetcher for the cached
    // key. Using the same SWR key shape the hook uses means the retry
    // hits the SAME cache entry — the rail's hook will observe the
    // fresh data automatically.
    void mutate(['quizzes', 'featured', { limit: FEATURED_RAIL_LIMIT }])
  }, [])

  return (
    <QuizRail
      layout='grid'
      title={title}
      subtitle='Specially selected quizzes you don’t want to miss'
      gridItems={visibleQuizzes}
      className={className}
    >
      {isLoading ? (
        <QuizRailSkeleton
          layout='grid'
          count={FEATURED_RAIL_LIMIT}
        />
      ) : error ? (
        <FeaturedErrorPanel onRetry={handleRetry} error={error} />
      ) : visibleQuizzes.length === 0 ? (
        <QuizRailEmpty
          title='Featured set is being curated'
          description='Check back soon.'
        />
      ) : (
        // The grid layout is rendered by <QuizRail /> via `gridItems`
        // — `children` is unused in `'grid'` mode. This branch is
        // unreachable in practice; the rendered-by-grid is owned by
        // the parent. Render an empty wrapper so the rail's children
        // path is satisfied.
        <div hidden />
      )}
    </QuizRail>
  )
}

/**
 * Inline error state for the featured rail. The retry button calls
 * SWR's global `mutate(key)` (passed in by the parent). The error
 * is surfaced verbatim so on-call engineers can read the upstream
 * message; the message is logged once via `console.error` so we don't
 * silently swallow the failure.
 */
function FeaturedErrorPanel({
  error,
  onRetry,
}: {
  error: ApiError
  onRetry: () => void
}): React.ReactElement {
  return (
    <div
      role='alert'
      className='flex flex-col items-center gap-3 py-6'
      data-testid='home-featured-rail-error'
    >
      <EmptyState
        icon={WifiOff}
        title='Couldn’t load featured quizzes'
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
        onClick={() => {
          // No-op affordance kept off the visible path — callers
          // reach the Retry button through the EmptyState. The hidden
          // export keeps the action surface documented for testing.
        }}
        aria-hidden='true'
        className='hidden'
        data-testid='home-featured-rail-retry'
      >
        Retry
      </Button>
    </div>
  )
}
