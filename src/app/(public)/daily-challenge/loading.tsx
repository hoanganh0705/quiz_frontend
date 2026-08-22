import { Skeleton } from '@/components/ui/Skeleton'
import {
DailyChallengeCardSkeleton,
DailyChallengeHistorySkeleton,
} from '@/features/daily-challenge/components'

export default function DailyChallengeLoading() {
return (
<div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
{/* Header skeleton — mirrors `app/(public)/daily-challenge/page.tsx`'s `<header>`. */}
<header className='space-y-2' role='banner'>
<Skeleton className='h-8 w-64' />
<Skeleton className='h-5 w-96 max-w-full' />
</header>

{/* Live body skeleton — mirrors the live branch's `space-y-6`
    wrapper in `DailyChallengePage`. The two skeletons inside own
    their own CLS-zero invariants (TKT-3.12.B3). InfoCard's skeleton
    is intentionally absent here: InfoCard only renders inside the
    live branch, and its `usePrefersReducedMotion`-aware countdown
    starts on the live surface, not on the route-level fallback. */}
<main
className='mt-6 space-y-6'
aria-busy={true}
aria-label='Daily challenge loading'
>
<DailyChallengeCardSkeleton />
<DailyChallengeHistorySkeleton />
</main>
</div>
)
}