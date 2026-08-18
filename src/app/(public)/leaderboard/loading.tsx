

import { Skeleton } from '@/components/ui/Skeleton'
import { LeaderboardRowSkeleton } from '@/components/ui/loading-states/Skeletons'

export default function LeaderboardLoading() {
return (
<div className='min-h-screen p-4 md:p-8 lg:p-12'>
{/* Header skeleton — matches LeaderboardHeader outer dimensions
          (title row + 4-col stat grid). */}
<div className='mb-6 sm:mb-8 space-y-6'>
<header
className='space-y-4 flex flex-col xl:flex-row justify-between items-start xl:items-center'
role='banner'
        >
<div className='text-center xl:text-left'>
<Skeleton className='h-8 w-48 mb-2' />
<Skeleton className='h-4 w-72' />
</div>
<div className='flex flex-wrap gap-2 justify-center items-center'>
<Skeleton className='h-8 w-28 rounded-md' />
<Skeleton className='h-8 w-32 rounded-md' />
</div>
</header>

{/* Stats Overview — 4-col grid matching the live
            LeaderboardHeader stats. */}
<section
className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
aria-label='Leaderboard statistics overview'
        >
{Array.from({ length: 4 }).map((_, i) => (
<div
key={i}
className='bg-background p-4 rounded-lg border border-border'
            >
<div className='flex items-center justify-between'>
<div>
<Skeleton className='h-4 w-24 mb-2' />
<Skeleton className='h-5 w-16' />
</div>
<Skeleton className='h-10 w-10 rounded-full' />
</div>
</div>
          ))}
</section>
</div>

{/* 2-column sidecar skeleton — matches CompetitionStats +
          LeaderboardHighlights (3-col at lg, 1-col below). */}
<section
className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6'
aria-label='Leaderboard statistics'
      >
<Skeleton className='h-32 w-full rounded-lg' />
<Skeleton className='h-32 w-full rounded-lg' />
</section>

{/* Live LeaderboardPage section — matches the section's
          outer chrome (space-y-6) and the period selector + table
          structure. The period selector and podium are rendered as
          part of this section's outer dimensions. */}
<section
className='mt-6 space-y-6'
aria-label='Global leaderboard'
aria-busy='true'
      >
{/* Period selector skeleton (matches the flex row with the
            title and the three-button group). */}
<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
<Skeleton className='h-6 w-44' />
<Skeleton className='h-9 w-72 rounded-lg' />
</div>

{/* Podium skeleton — matches the live top-3 row (2nd, 1st,
            3rd column order; 1st is taller). */}
<div className='flex items-end justify-center gap-3 sm:gap-6'>
{/* 2nd place */}
<div className='flex flex-col items-center gap-2 rounded-t-xl border border-border p-3 bg-slate-800/40 h-44 w-32'>
<Skeleton className='h-12 w-12 rounded-full' />
<Skeleton className='h-4 w-16' />
<Skeleton className='h-3 w-12' />
<Skeleton className='h-8 w-16 rounded-md' />
</div>
{/* 1st place — taller and offset upward */}
<div className='flex flex-col items-center gap-2 rounded-t-xl border border-yellow-500/30 p-3 bg-yellow-500/10 h-48 w-32 -mt-6'>
<Skeleton className='h-16 w-16 rounded-full' />
<Skeleton className='h-4 w-20' />
<Skeleton className='h-3 w-12' />
<Skeleton className='h-8 w-16 rounded-md' />
</div>
{/* 3rd place */}
<div className='flex flex-col items-center gap-2 rounded-t-xl border border-border p-3 bg-slate-800/40 h-40 w-32'>
<Skeleton className='h-12 w-12 rounded-full' />
<Skeleton className='h-4 w-16' />
<Skeleton className='h-3 w-12' />
<Skeleton className='h-8 w-16 rounded-md' />
</div>
</div>

{/* Table skeleton — matches the live LeaderboardSkeleton
            (10 rows, card border, space-y-1 p-2 inner layout). */}
<div
role='status'
aria-live='polite'
aria-label='Loading leaderboard'
className='bg-card border border-border rounded-lg overflow-hidden'
        >
<div className='space-y-1 p-2'>
{Array.from({ length: 10 }).map((_, i) => (
<LeaderboardRowSkeleton key={i} />
            ))}
</div>
</div>
</section>
</div>
  )
}
