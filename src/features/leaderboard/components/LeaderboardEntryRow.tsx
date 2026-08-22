'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { cn } from '@/shared/utils/merge-class-names'

import type { LeaderboardEntryWithId } from '@/features/leaderboard/hooks/useLeaderboard'
import { getRankColor } from '@/features/leaderboard/lib/leaderboard-presentation'

export interface LeaderboardEntryRowProps {

entry: LeaderboardEntryWithId

isAuthenticated: boolean

className?: string
}

export function LeaderboardEntryRow({
entry,
isAuthenticated,
className,
}: LeaderboardEntryRowProps) {

const isSelfEntry = isAuthenticated && entry.isCurrentUser === true

const avatarFallbackLetter = entry.displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <li
      aria-current={isSelfEntry ? 'true' : undefined}
      data-leaderboard-row={entry.userId}
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg p-3',
        'transition-colors',
        isSelfEntry
          ? 'bg-primary/10 ring-1 ring-primary/40'
          : 'bg-slate-800/30',
        className,
      )}
    >
{/* Left cluster: rank, dense rank, avatar, display name */}
<div className='flex min-w-0 flex-1 items-center gap-3'>
<div className='flex w-12 shrink-0 flex-col items-center'>
<span
className={cn(
'text-lg font-bold tabular-nums',
getRankColor(entry.rank),
            )}
aria-label={`Rank ${entry.rank}`}
          >
#{entry.rank}
</span>
<span
className='text-xs text-slate-400 tabular-nums'
aria-label={`Dense rank ${entry.denseRank}`}
          >
d#{entry.denseRank}
</span>
</div>

<Avatar className='h-10 w-10 shrink-0'>
{entry.avatarUrl ? (
        <AvatarImage src={entry.avatarUrl} alt="" />
          ) : null}
<AvatarFallback>{avatarFallbackLetter}</AvatarFallback>
</Avatar>

<div className='min-w-0 flex-1'>
<p
className={cn(
'truncate text-sm font-medium',
isSelfEntry ? 'text-primary-foreground' : 'text-white',
            )}
          >
{entry.displayName}
{isSelfEntry ? (
<span className='ml-2 text-xs font-normal text-primary'>
(you)
              </span>
            ) : null}
</p>
{entry.isTied ? (
<p className='text-xs text-slate-400'>Tied</p>
          ) : null}
</div>
</div>

{/* Right cluster: XP with thousands separators */}
<div className='flex shrink-0 items-center gap-1'>
<span
className='rounded-full bg-slate-700/60 px-2 py-0.5 text-xs font-semibold text-white tabular-nums'
aria-label={`${entry.xp} XP`}
        >
{entry.xp.toLocaleString()} XP
        </span>
      </div>

      {/* Right cluster: XP with thousands separators */}
      <div className="flex shrink-0 items-center gap-1">
        <span
          className="rounded-full bg-slate-700/60 px-2 py-0.5 text-xs font-semibold text-white tabular-nums"
          aria-label={`${entry.xp} XP`}
        >
          {entry.xp.toLocaleString()} XP
        </span>
      </div>
    </li>
  )
}
