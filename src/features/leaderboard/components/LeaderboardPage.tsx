'use client'

/**
 * `LeaderboardPage` — the live composition for the `/leaderboard` route.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.C1.
 *
 * Composes the period selector, the podium (top-3), the table
 * (entries 4+), and the load-more button into a single live page that
 * drives `useLeaderboard(period)`.
 *
 * ## State ownership
 *
 * The composition owns:
 *   - the `period` state (default `weekly` — drift A1 §8 lock);
 *   - the auth flag (from the project's `useAuthState` hook);
 *   - the podium layout for top-3 entries;
 *   - the table layout for entries 4+;
 *   - the load-more button (calls `loadMore` from the hook);
 *   - the empty-state branch (`entries.length === 0` && !isLoading);
 *   - the loading branch (skeleton when `isLoading === true`);
 *   - the error branch (5xx → retry banner; 404 → inline "This period
 *     isn't supported").
 *
 * ## CLS-zero invariant
 *
 * The skeleton's outer dimensions match the live table's outer
 * dimensions at every breakpoint. Both render with the same
 * `bg-card border border-border rounded-lg overflow-hidden` chrome so
 * the route-skeleton-to-live swap is CLS-zero.
 *
 * ## Self-entry highlight
 *
 * The auth flag is sourced from `useAuthState`. The
 * `LeaderboardEntryRow` (B3) handles the actual highlight based on
 * the entry's `isCurrentUser` flag. The composition does not need to
 * do anything special — the row component gates the highlight on
 * `isAuthenticated` already.
 *
 * ## Default period is `weekly`
 *
 * The first-paint period is `weekly` per master plan open decision #3
 * from `PHASE_3_EPICS.md` line 1325. The selector default and the
 * wrapper default are both `weekly` so the contract is invariant.
 *
 * ## No data fetching
 *
 * The composition does NOT perform any data fetching directly — all
 * reads go through `useLeaderboard(period)`. The composition is the
 * glue between the hook and the presentational components.
 */

import { useCallback, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { ApiError } from '@/lib/api'

import { useAuthState } from '@/features/auth/hooks/use-auth-state'
import { useLeaderboard } from '@/features/leaderboard/hooks/useLeaderboard'
import type { LeaderboardPeriod } from '@/features/leaderboard/services/leaderboard.service'
import { LeaderboardPeriodSelector } from './LeaderboardPeriodSelector'
import { LeaderboardEntryRow } from './LeaderboardEntryRow'
import { LeaderboardSkeleton } from './LeaderboardSkeleton'
import { LeaderboardEmptyState } from './LeaderboardEmptyState'
import { getRankColor } from '@/features/leaderboard/lib/leaderboard-presentation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { cn } from '@/shared/utils/merge-class-names'

// ──────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────

/**
 * The Phase 3 default period is `weekly` (master plan open decision
 * #3 from `PHASE_3_EPICS.md` line 1325). The composition
 * initializes with this value and the selector falls back to it as
 * well.
 */
const DEFAULT_PERIOD: LeaderboardPeriod = 'weekly'

export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>(DEFAULT_PERIOD)

  // Auth state — drives the self-entry highlight. The
  // `LeaderboardEntryRow` component gates the highlight on
  // `isAuthenticated`, so the composition only needs to forward the
  // flag to each row.
  const { isAuthenticated } = useAuthState()

  // Live data — the hook is the single source of truth for entries,
  // pagination, error, and retry state.
  const {
    entries,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    retryBannerVisible,
  } = useLeaderboard(period)

  // Stable period change handler. The selector is a controlled
  // component — the composition owns the state and forwards changes
  // through this callback.
  const handlePeriodChange = useCallback((next: LeaderboardPeriod) => {
    setPeriod(next)
  }, [])

  // Stable retry handler — the cursor primitive's `refresh()` is the
  // canonical retry path. The 5xx retry banner is the only place this
  // is exposed.
  const handleRetry = useCallback(() => {
    void refresh()
  }, [refresh])

  // ─── Branch derivation ────────────────────────────────────────────
  //
  // The branch order matters:
  //   1. Error branch first (errors supersede loading / empty).
  //   2. Loading branch second (skeleton on first paint and on period
  //      switch — the SWR key change forces a fresh fetch).
  //   3. Empty branch third (no entries after a successful load).
  //   4. Live branch last (default).
  const isPeriodUnsupportedError =
    error instanceof ApiError && error.status === 404
  const isServerError = error instanceof ApiError && error.status >= 500
  const showErrorInline = isPeriodUnsupportedError
  const showRetryBanner = isServerError || retryBannerVisible

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <section
      className='space-y-6'
      aria-label='Global leaderboard'
      data-testid='leaderboard-page'
    >
      {/* Period selector — controlled by the composition */}
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <h2 className='text-lg font-semibold text-foreground'>
          Global leaderboard
        </h2>
        <LeaderboardPeriodSelector period={period} onChange={handlePeriodChange} />
      </div>

      {/* 404 inline error (drift A1 §4) */}
      {showErrorInline ? (
        <div
          role='alert'
          className='flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100'
          data-testid='leaderboard-404'
        >
          <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
          <div>
            <p className='font-medium'>This period isn&apos;t supported</p>
            <p className='mt-1 text-yellow-200/80'>
              Try selecting a different period above.
            </p>
          </div>
        </div>
      ) : null}

      {/* 5xx retry banner */}
      {showRetryBanner ? (
        <div
          role='alert'
          className='flex flex-col gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between'
          data-testid='leaderboard-5xx-banner'
        >
          <div className='flex items-start gap-3'>
            <AlertCircle
              className='mt-0.5 h-4 w-4 shrink-0'
              aria-hidden='true'
            />
            <p>Something went wrong loading the leaderboard.</p>
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleRetry}
            className='border-red-500/50 text-red-100 hover:bg-red-500/20'
          >
            Retry
          </Button>
        </div>
      ) : null}

      {/* Loading branch — skeleton on first paint and on period switch */}
      {isLoading ? (
        <LeaderboardSkeleton count={10} />
      ) : entries.length === 0 ? (
        /* Empty branch — no entries after a successful load */
        <LeaderboardEmptyState onRetry={showRetryBanner ? handleRetry : undefined} />
      ) : (
        /* Live branch — podium + table + load-more */
        <>
          <Podium
            entries={entries.filter((e) => e.rank <= 3)}
            isAuthenticated={isAuthenticated}
          />
          <div className='space-y-2' data-testid='leaderboard-rows'>
            {entries
              .filter((e) => e.rank > 3)
              .map((entry) => (
                <LeaderboardEntryRow
                  key={entry.userId}
                  entry={entry}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            {/* If the page has fewer than 4 entries, the table section is empty
                and the load-more button still anchors to the bottom of the list. */}
          </div>

          {hasMore ? (
            <div className='flex justify-center pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={loadMore}
                disabled={isLoadingMore}
                aria-busy={isLoadingMore}
                data-testid='leaderboard-load-more'
              >
                {isLoadingMore ? (
                  <>
                    <Loader2
                      className='mr-2 h-4 w-4 animate-spin'
                      aria-hidden='true'
                    />
                    Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Podium sub-component (top-3 entries)
// ──────────────────────────────────────────────────────────────────────────

interface PodiumProps {
  entries: ReturnType<typeof useLeaderboard>['entries']
  isAuthenticated: boolean
}

const PODIUM_ORDER: ReadonlyArray<{ slot: 1 | 2 | 3; heightClass: string; offset: string }> = [
  { slot: 1, heightClass: 'h-44', offset: '-mt-6' },
  { slot: 2, heightClass: 'h-36', offset: 'mt-0' },
  { slot: 3, heightClass: 'h-32', offset: 'mt-0' },
]

function Podium({ entries, isAuthenticated }: PodiumProps) {
  if (entries.length === 0) return null

  // Podium order: 2nd, 1st, 3rd (the canonical podium layout — 1st
  // is the tallest and centered, 2nd and 3rd flank it).
  const byRank = new Map(entries.map((entry) => [entry.rank, entry]))
  const first = byRank.get(1)
  const second = byRank.get(2)
  const third = byRank.get(3)

  return (
    <div
      className='flex items-end justify-center gap-3 sm:gap-6'
      data-testid='leaderboard-podium'
      aria-label='Top 3 leaderboard entries'
    >
      {second ? (
        <PodiumColumn
          entry={second}
          isAuthenticated={isAuthenticated}
          {...PODIUM_ORDER[1]}
        />
      ) : null}
      {first ? (
        <PodiumColumn
          entry={first}
          isAuthenticated={isAuthenticated}
          {...PODIUM_ORDER[0]}
        />
      ) : null}
      {third ? (
        <PodiumColumn
          entry={third}
          isAuthenticated={isAuthenticated}
          {...PODIUM_ORDER[2]}
        />
      ) : null}
    </div>
  )
}

interface PodiumColumnProps {
  entry: ReturnType<typeof useLeaderboard>['entries'][number]
  isAuthenticated: boolean
  slot: 1 | 2 | 3
  heightClass: string
  offset: string
}

function PodiumColumn({
  entry,
  isAuthenticated,
  slot,
  heightClass,
  offset,
}: PodiumColumnProps) {
  const isSelf = isAuthenticated && entry.isCurrentUser === true

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-t-xl border border-border p-3',
        slot === 1 ? 'bg-yellow-500/10 ring-1 ring-yellow-500/30' : 'bg-slate-800/40',
        isSelf ? 'ring-2 ring-primary' : '',
        offset,
      )}
      aria-current={isSelf ? 'true' : undefined}
    >
      <Avatar className={cn(slot === 1 ? 'h-16 w-16' : 'h-12 w-12')}>
        {entry.avatarUrl ? (
          <AvatarImage src={entry.avatarUrl} alt={entry.displayName} />
        ) : null}
        <AvatarFallback>
          {entry.displayName?.[0]?.toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>
      <p className={cn('text-sm font-semibold', getRankColor(entry.rank))}>
        {entry.displayName}
        {isSelf ? <span className='ml-1 text-xs text-primary'>(you)</span> : null}
      </p>
      <p className='text-xs text-slate-400 tabular-nums'>
        {entry.xp.toLocaleString()} XP
      </p>
      <div
        className={cn(
          'flex w-16 items-center justify-center rounded-md text-lg font-bold tabular-nums',
          slot === 1
            ? 'bg-amber-500 text-amber-950'
            : slot === 2
              ? 'bg-slate-400 text-slate-950'
              : 'bg-orange-600 text-white',
          heightClass,
        )}
        aria-label={`Rank ${entry.rank}`}
      >
        #{entry.rank}
      </div>
    </div>
  )
}
