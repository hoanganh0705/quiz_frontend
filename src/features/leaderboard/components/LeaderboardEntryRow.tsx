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
        'flex items-center justify-between gap-4 rounded-xl p-3 sm:px-4',
        'border transition-colors duration-200',
        isSelfEntry
          ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/40'
          : 'bg-card/60 border-border/60 hover:bg-muted/30',
        className,
      )}
    >
{/* Left cluster: rank, dense rank, avatar, display name */}
<div className='flex min-w-0 flex-1 items-center gap-3'>
<div className='flex w-12 shrink-0 flex-col items-center'>
<span
className={cn(
'text-base sm:text-lg font-bold font-mono tabular-nums',
getRankColor(entry.rank),
            )}
aria-label={`Rank ${entry.rank}`}
          >
#{entry.rank}
</span>
<span
className='text-xs font-mono text-muted-foreground tabular-nums'
aria-label={`Dense rank ${entry.denseRank}`}
          >
d#{entry.denseRank}
</span>
</div>

<Avatar className='h-9 w-9 sm:h-10 sm:w-10 shrink-0 border border-border/40'>
{entry.avatarUrl ? (
        <AvatarImage src={entry.avatarUrl} alt="" />
          ) : null}
<AvatarFallback>{avatarFallbackLetter}</AvatarFallback>
</Avatar>

<div className='min-w-0 flex-1'>
<p
className={cn(
'truncate text-sm font-medium',
isSelfEntry ? 'text-primary font-semibold' : 'text-foreground',
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
<p className='text-xs text-muted-foreground'>Tied</p>
          ) : null}
</div>
</div>

{/* Right cluster: XP with thousands separators */}
<div className='flex shrink-0 items-center gap-1'>
<span
className='rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold font-mono text-primary tabular-nums'
aria-label={`${entry.xp} XP`}
        >
{entry.xp.toLocaleString()} XP
        </span>
      </div>
    </li>
  )
}
