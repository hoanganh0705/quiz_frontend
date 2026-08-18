"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

interface GameQuestionSkeletonProps {
className?: string;
}

export function GameQuestionSkeleton({ className }: GameQuestionSkeletonProps) {
return (
<div
className={cn("space-y-4", className)}
data-testid="game-question-skeleton"
    >
{/* Metadata row */}
<div className="flex items-center gap-3">
<Skeleton className="h-5 w-20 rounded-full" />
<Skeleton className="h-5 w-16 rounded-full" />
<Skeleton className="h-5 w-14 rounded-full" />
</div>

{/* Question text */}
<div className="space-y-2">
<Skeleton className="h-6 w-full" />
<Skeleton className="h-6 w-4/5" />
</div>
</div>
  );
}

interface GameOptionsSkeletonProps {

count?: number;
className?: string;
}

export function GameOptionsSkeleton({
count = 4,
className,
}: GameOptionsSkeletonProps) {
return (
<div
className={cn("space-y-3", className)}
data-testid="game-options-skeleton"
    >
{Array.from({ length: count }).map((_, i) => (
<div
key={i}
className="flex items-center gap-3 p-4 rounded-lg border"
        >
{/* Radio indicator */}
<Skeleton className="h-5 w-5 rounded-full shrink-0" />
{/* Option text */}
<div className="flex-1 space-y-1.5">
<Skeleton className="h-4 w-full" />
<Skeleton className="h-4 w-3/4" />
</div>
</div>
      ))}
</div>
  );
}

interface GameTimerSkeletonProps {
className?: string;
}

export function GameTimerSkeleton({ className }: GameTimerSkeletonProps) {
return (
<div
className={cn("flex items-center gap-4", className)}
data-testid="game-timer-skeleton"
    >
{/* Timer bar */}
<div className="flex-1 space-y-1.5">
<Skeleton className="h-2 w-full rounded-full" />
<div className="flex justify-between">
<Skeleton className="h-3 w-12" />
<Skeleton className="h-3 w-12" />
</div>
</div>
{/* Submission state indicator */}
<Skeleton className="h-8 w-24 rounded-full" />
</div>
  );
}

interface GameProgressPanelSkeletonProps {
className?: string;
}

export function GameProgressPanelSkeleton({
className,
}: GameProgressPanelSkeletonProps) {
return (
<div
className={cn("space-y-2", className)}
data-testid="game-progress-skeleton"
    >
<Skeleton className="h-4 w-28" />
<div className="flex items-center gap-2">
<Skeleton className="h-8 w-8 rounded-full" />
<Skeleton className="h-4 w-20" />
</div>
<div className="flex items-center gap-2">
<Skeleton className="h-8 w-8 rounded-full" />
<Skeleton className="h-4 w-16" />
</div>
</div>
  );
}

interface GameLeaderboardSkeletonProps {

rows?: number;
className?: string;
}

export function GameLeaderboardSkeleton({
rows = 5,
className,
}: GameLeaderboardSkeletonProps) {
return (
<div
className={cn("space-y-2", className)}
data-testid="game-leaderboard-skeleton"
    >
<Skeleton className="h-4 w-24" />
{Array.from({ length: rows }).map((_, i) => (
<div key={i} className="flex items-center gap-3 p-2">
{/* Rank badge */}
<Skeleton className="h-6 w-6 rounded-full shrink-0" />
{/* Avatar */}
<Skeleton className="h-7 w-7 rounded-full shrink-0" />
{/* Name */}
<Skeleton className="h-4 flex-1 max-w-32" />
{/* Score */}
<Skeleton className="h-4 w-14" />
</div>
      ))}
</div>
  );
}

interface GameSkeletonProps {
className?: string;
}

export function GameSkeleton({ className }: GameSkeletonProps) {
return (
<div
className={cn("space-y-6", className)}
data-testid="game-skeleton"
    >
{/* Top row: progress + leaderboard */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<GameProgressPanelSkeleton />
<GameLeaderboardSkeleton />
</div>

{/* Question */}
<GameQuestionSkeleton />

{/* Options */}
<GameOptionsSkeleton />

{/* Timer + submission */}
<GameTimerSkeleton />
</div>
  );
}
