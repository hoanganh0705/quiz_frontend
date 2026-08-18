'use client';

import { Skeleton } from '@/components/ui/Skeleton';

const SKELETON_GRID_CLASSES =
'grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5';

export function SecuritySummarySkeleton() {
return (
<div
aria-hidden='true'
aria-busy='true'
className={SKELETON_GRID_CLASSES}
data-testid='security-summary-skeleton'
    >
{/* Field 1 — Email verification */}
<div>
<Skeleton className='h-4 w-32 mb-1' />
<Skeleton className='h-5 w-20' />
</div>

{/* Field 2 — Active session count */}
<div>
<Skeleton className='h-4 w-32 mb-1' />
<Skeleton className='h-5 w-16' />
</div>

{/* Field 3 — Last sign-in */}
<div>
<Skeleton className='h-4 w-40 mb-1' />
<Skeleton className='h-5 w-44' />
</div>

{/* Field 4 — Password age */}
<div>
<Skeleton className='h-4 w-28 mb-1' />
<Skeleton className='h-5 w-20' />
</div>
</div>
  );
}
