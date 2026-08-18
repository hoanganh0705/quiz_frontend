'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export interface SessionListSkeletonProps {
rowCount?: number;
}

export function SessionListSkeleton({ rowCount = 3 }: SessionListSkeletonProps) {
const count = Math.max(1, Math.min(rowCount, 10));
return (
<ul
aria-hidden='true'
aria-busy='true'
data-testid='session-list-skeleton'
    >
{Array.from({ length: count }).map((_, i) => (
<li
key={i}
className='flex items-start gap-4 py-4 border-b border-border last:border-b-0'
        >
<div className='flex-1 min-w-0'>
{/* Device line */}
<Skeleton className='h-5 w-2/3 mb-2' />
{/* IP + last-active */}
<Skeleton className='h-4 w-1/2' />
</div>
{/* Revoke button placeholder */}
<Skeleton className='h-9 w-20' />
</li>
      ))}
</ul>
  );
}
