'use client'

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

const DEFAULT_PERIOD: LeaderboardPeriod = 'weekly'

export function LeaderboardPage() {
const [period, setPeriod] = useState<LeaderboardPeriod>(DEFAULT_PERIOD)

const { isAuthenticated } = useAuthState()

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

const handlePeriodChange = useCallback((next: LeaderboardPeriod) => {
setPeriod(next)
  }, [])

const handleRetry = useCallback(() => {
void refresh()
  }, [refresh])

const isPeriodUnsupportedError =
error instanceof ApiError && error.status === 404
const isServerError = error instanceof ApiError && error.status >= 500
const showErrorInline = isPeriodUnsupportedError
const showRetryBanner = isServerError || retryBannerVisible

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

      {/* 404 inline error */}
      {showErrorInline ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-status-warning/30 bg-status-warning/10 p-4 text-sm text-status-warning"
          data-testid="leaderboard-404"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">This period isn&apos;t supported</p>
            <p className="mt-1 text-status-warning/80">
              Try selecting a different period above.
            </p>
          </div>
        </div>
      ) : null}

      {/* 5xx retry banner */}
      {showRetryBanner ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
          data-testid="leaderboard-5xx-banner"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <p>Something went wrong loading the leaderboard.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="border-destructive/50 text-destructive hover:bg-destructive/20"
          >
            Retry
          </Button>
        </div>
      ) : null}

{/* Loading branch — skeleton on first paint and on period switch */}
{isLoading ? (
<LeaderboardSkeleton count={10} />
      ) : entries.length === 0 ? (

<LeaderboardEmptyState onRetry={showRetryBanner ? handleRetry : undefined} />
      ) : (

<>
<Podium
entries={entries.filter((e) => e.rank <= 3)}
isAuthenticated={isAuthenticated}
          />
<ol className="space-y-2 list-none" data-testid="leaderboard-rows" aria-label="Leaderboard entries">
          {entries
              .filter((e) => e.rank > 3)
              .map((entry) => (
                <LeaderboardEntryRow
                  key={entry.userId}
                  entry={entry}
                  isAuthenticated={isAuthenticated}
                />
              ))}
        </ol>

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

interface PodiumProps {
entries: ReturnType<typeof useLeaderboard>['entries']
isAuthenticated: boolean
}

const PODIUM_ORDER: ReadonlyArray<{ slot: 1 | 2 | 3; heightClass: string; offset: string }> = [
  { slot: 1, heightClass: 'h-36 sm:h-44', offset: '-mt-6 sm:-mt-6' },
  { slot: 2, heightClass: 'h-28 sm:h-36', offset: 'mt-2 sm:mt-0' },
  { slot: 3, heightClass: 'h-24 sm:h-32', offset: 'mt-2 sm:mt-0' },
]

function Podium({ entries, isAuthenticated }: PodiumProps) {
if (entries.length === 0) return null

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
        <AvatarImage src={entry.avatarUrl} alt="" />
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
        role="img"
        aria-label={`Rank ${entry.rank}`}
      >
        #{entry.rank}
      </div>
</div>
  )
}
