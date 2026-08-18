"use client";

import { TournamentCardSkeleton } from "./TournamentSkeleton";

interface TournamentListSkeletonProps {

count?: number;
className?: string;
}

export function TournamentListSkeleton({
count = 8,
className,
}: TournamentListSkeletonProps) {
return (
<div
className={className}
data-testid="tournament-list-skeleton"
    >
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
{Array.from({ length: count }).map((_, i) => (
<TournamentCardSkeleton key={i} />
        ))}
</div>
</div>
  );
}
