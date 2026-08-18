

'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export interface TournamentAdminSkeletonProps {

rows?: number;
}

export function TournamentAdminSkeleton({
rows = 5,
}: TournamentAdminSkeletonProps): React.ReactElement {
return (
<div
className="space-y-2"
data-testid="tournament-admin-skeleton"
aria-busy="true"
aria-label="Loading tournaments"
    >
{Array.from({ length: rows }, (_, i) => (
<div
key={i}
className="flex items-center gap-4 rounded-md border p-3"
data-testid="tournament-admin-skeleton-row"
        >
{/* Title + description */}
<div className="flex-1 space-y-1.5">
<Skeleton className="h-4 w-48" />
<Skeleton className="h-3 w-32" />
</div>

{/* Status pill */}
<Skeleton className="h-5 w-20 rounded-full" />

{/* Window */}
<div className="hidden w-36 space-y-1 sm:block">
<Skeleton className="h-3 w-full" />
<Skeleton className="h-3 w-3/4" />
</div>

{/* Capacity */}
<Skeleton className="h-4 w-16" />

{/* Actions */}
<Skeleton className="h-8 w-20" />
</div>
      ))}
</div>
  );
}
