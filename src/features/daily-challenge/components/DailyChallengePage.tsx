'use client'

/**
 * `DailyChallengePage` — the live composition for the
 * `/daily-challenge` route.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.C1.
 *
 * Composes the today's-challenge card, the streak indicator, the
 * history list, and the load-more button into a single live page that
 * drives `useDailyChallengeToday()` and `useDailyChallengeHistory()`,
 * and `useDailyChallengeStreakView()`.
 *
 * ## Branch coverage
 *
 * The composition owns a five-way switch on (flag / wrapper status /
 * data / loading / error):
 *
 *   1. **Placeholder** — when the route-level feature flag is
 *      `'placeholder'`, OR when EITHER hook reports
 *      `isMissingEndpoint === true`. The placeholder is the "we're
 *      preparing the daily challenge" surface.
 *   2. **Skeleton** — when `isLoading === true` and the wrapper has
 *      not reported `kind: 'missing-endpoint'`. Mirrors the legacy
 *      loading surface for CLS-zero continuity.
 *   3. **Empty** — when the challenge hook resolves with
 *      `challenge: null`, loading is complete, and the wrapper did
 *      not report `kind: 'missing-endpoint'`. Shown alongside a
 *      history empty-state (history is allowed to be empty here).
 *   4. **Live** — the day's challenge card, the streak indicator
 *      (gated on auth), the history list (delegated to the list
 *      component, which in turn delegates to its empty-state when
 *      `items.length === 0`), and the load-more button when
 *      `hasMore === true`.
 *   5. **Error** — the "today" hook's `error` is surfaced as a toast
 *      for 5xx and an inline "Today's challenge isn't available
 *      right now" message for non-404 4xx; the "history" hook's
 *      error is surfaced as a toast but the today card continues to
 *      render (graceful degradation).
 *
 * ## CLS-zero invariant
 *
 * The composition's outer dimensions
 * (`space-y-6` between the three regions — card / history, plus the
 * inline error region) match the route-level `loading.tsx` skeleton
 * (TKT-3.12.D1). The individual presentational components own their
 * own CLS-zero invariants (TKT-3.12.B3). The composition never
 * adjusts the outer wrapper, padding, or block gap on a data state
 * change.
 *
 * ## State ownership
 *
 * The composition does NOT own any state. It is pure presentation of
 * the three B-batch hooks:
 *
 *   - `useDailyChallengeToday()` — the day's challenge.
 *   - `useDailyChallengeHistory()` — the paginated history.
 *   - `useDailyChallengeStreakView()` — the streak signal + auth.
 *
 * ## Error toast surface
 *
 * Story 3.12 leaves the toast implementation out of scope (the
 * project does not yet own a stable toast primitive). The
 * composition renders error UIs inline for the today-read; the
 * history error renders as a small inline error above the history
 * region (graceful degradation; the card is unaffected). Future
 * tickets (Phase 5) can hoist these to a shared toast primitive.
 */

import { AlertCircle } from 'lucide-react'

import { ApiError } from '@/lib/api'

import {
  useDailyChallengeToday,
} from '@/features/daily-challenge/hooks/useDailyChallengeToday'
import {
  useDailyChallengeHistory,
} from '@/features/daily-challenge/hooks/useDailyChallengeHistory'
import {
  useDailyChallengeStreakView,
} from '@/features/daily-challenge/hooks/useDailyChallengeStreakView'
import {
  DailyChallengeCard,
  DailyChallengeCardSkeleton,
  DailyChallengeHistoryList,
  DailyChallengeHistorySkeleton,
  DailyChallengePlaceholder,
  DailyChallengeStreakIndicator,
} from '@/features/daily-challenge/components'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * The Phase 3 feature-flag value (see `feature-flags.ts` A2). The
 * composition receives the value as a prop so the route-level
 * `page.tsx` (TKT-3.12.D2) is the single read site for the flag at
 * the route boundary. When the flag is `'placeholder'`, the
 * composition short-circuits to the placeholder surface regardless
 * of the wrappers' status.
 */
export interface DailyChallengePageProps {
  flagValue: 'v1' | 'placeholder'
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Classify an `ApiError` into the inline / toast buckets Story 3.12
 * mandates. The wrapper reports `kind: 'missing-endpoint'` before any
 * HTTP call, so a real 404 here means the upstream /daily-challenge
 * operation returned 404 (not the route guard). A 404 is treated as
 * a permanent absence, not an error: the inline "isn't available
 * right now" copy renders.
 */
function isPermanentUnavailable(error: ApiError): boolean {
  return error.status === 404
}

function isTransient5xx(error: ApiError): boolean {
  return error.status >= 500
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DailyChallengePage({
  flagValue,
  className,
}: DailyChallengePageProps) {
  // ── Data (Batch B hooks; no data fetching here) ────────────────────────

  const {
    challenge,
    isLoading: isTodayLoading,
    error: todayError,
    isMissingEndpoint: todayIsMissingEndpoint,
  } = useDailyChallengeToday()

  const {
    items,
    isLoading: isHistoryLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error: historyError,
    isMissingEndpoint: historyIsMissingEndpoint,
  } = useDailyChallengeHistory()

  const { streak, isAuthenticated } = useDailyChallengeStreakView()

  // ── Branch 1: placeholder ───────────────────────────────────────────────

  const shouldRenderPlaceholder =
    flagValue === 'placeholder' ||
    todayIsMissingEndpoint ||
    historyIsMissingEndpoint

  if (shouldRenderPlaceholder) {
    return (
      <div
        role='region'
        aria-label='Daily challenge'
        data-testid='daily-challenge-page-placeholder'
        className={className}
      >
        <DailyChallengePlaceholder />
      </div>
    )
  }

  // ── Branch 2: loading skeleton ──────────────────────────────────────────

  if (isTodayLoading || isHistoryLoading) {
    return (
      <div
        role='region'
        aria-label='Daily challenge'
        aria-busy={true}
        data-testid='daily-challenge-page-skeleton'
        className={['space-y-6', className].filter(Boolean).join(' ')}
      >
        <DailyChallengeCardSkeleton />
        <DailyChallengeHistorySkeleton />
      </div>
    )
  }

  // ── Branch 5 (partial): history error surfaced before the today branch
  // so a history 5xx does not block the today card. The today branch
  // continues to render. This is "graceful degradation" — the today
  // card is the primary surface; history is secondary.

  const historyErrorRegion = historyError ? (
    <div
      role='alert'
      data-testid='daily-challenge-history-error'
      className='flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-900 dark:text-yellow-100'
    >
      <AlertCircle className='h-4 w-4' aria-hidden='true' />
      <span>
        History is unavailable right now. Today&apos;s challenge below
        is unaffected.
      </span>
    </div>
  ) : null

  // ── Branch 5: today error ──────────────────────────────────────────────

  if (todayError) {
    if (isTransient5xx(todayError)) {
      return (
        <div
          role='alert'
          data-testid='daily-challenge-page-error'
          className={['space-y-6', className].filter(Boolean).join(' ')}
        >
          <div className='flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
            <AlertCircle className='h-4 w-4' aria-hidden='true' />
            <span>
              We&apos;re having trouble loading today&apos;s challenge.
              Please try again in a moment.
            </span>
          </div>
          {historyErrorRegion}
        </div>
      )
    }
    if (isPermanentUnavailable(todayError)) {
      // The wrapper normally short-circuits 404s to `missing-endpoint`,
      // so a real 404 here means the backend is configured but
      // explicitly returned 404. The "isn't available right now"
      // copy mirrors the Story 3.12 AC #8 wording.
      return (
        <div
          role='alert'
          data-testid='daily-challenge-page-error-inline'
          className={['space-y-6', className].filter(Boolean).join(' ')}
        >
          <div className='flex items-center gap-2 rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-foreground/80'>
            <AlertCircle className='h-4 w-4' aria-hidden='true' />
            <span>
              Today&apos;s challenge isn&apos;t available right now.
              Please check back later.
            </span>
          </div>
          {historyErrorRegion}
        </div>
      )
    }
    // 4xx non-404 — also treated as inline (per AC #8 — "any other 4xx
    // is an inline error").
    return (
      <div
        role='alert'
        data-testid='daily-challenge-page-error-inline'
        className={['space-y-6', className].filter(Boolean).join(' ')}
      >
        <div className='flex items-center gap-2 rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-foreground/80'>
          <AlertCircle className='h-4 w-4' aria-hidden='true' />
          <span>
            Today&apos;s challenge isn&apos;t available right now.
            Please check back later.
          </span>
        </div>
        {historyErrorRegion}
      </div>
    )
  }

  // ── Branch 3: empty (challenge is null after loading, no missing-endpoint) ─

  if (challenge === null) {
    return (
      <div
        role='region'
        aria-label='Daily challenge'
        data-testid='daily-challenge-page-empty'
        className={['space-y-6', className].filter(Boolean).join(' ')}
      >
        <div className='rounded-md border border-border bg-muted/50 px-4 py-6 text-center text-sm text-foreground/80'>
          No daily challenge today — check back tomorrow.
        </div>
        {historyErrorRegion}
        <DailyChallengeHistoryList
          items={items}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
        />
      </div>
    )
  }

  // ── Branch 4: live surface ──────────────────────────────────────────────

  return (
    <div
      role='region'
      aria-label='Daily challenge'
      data-testid='daily-challenge-page-live'
      className={['space-y-6', className].filter(Boolean).join(' ')}
    >
      <DailyChallengeCard challenge={challenge} />
      {isAuthenticated && streak !== null ? (
        <div className='flex justify-end'>
          <DailyChallengeStreakIndicator streak={streak} />
        </div>
      ) : null}
      {historyErrorRegion}
      <DailyChallengeHistoryList
        items={items}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
      />
    </div>
  )
}
