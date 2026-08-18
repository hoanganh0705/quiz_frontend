

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

{/* InfoCard skeleton — mirrors the sibling `<InfoCard />` rendered
          in `page.tsx`. Its outer dimensions are identical (the
          `grid-cols-1 lg:grid-cols-4 gap-4 mt-6` block + 4 cols
          of single-row cards). */}
<section
className='grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6'
aria-label='Challenge information loading'
aria-busy={true}
      >
{Array.from({ length: 4 }).map((_, i) => (
<div
key={i}
className='border border-border rounded-xl p-4 flex items-center space-x-3'
          >
<Skeleton className='h-10 w-10 rounded-full' />
<div className='flex-1 space-y-2'>
<Skeleton className='h-3 w-24' />
<Skeleton className='h-5 w-32' />
</div>
</div>
        ))}
</section>

{/* Live body skeleton — mirrors `<DailyChallengePage />`'s
          `space-y-6` wrapper. The two skeletons inside own their own
          CLS-zero invariants (TKT-3.12.B3). */}
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
