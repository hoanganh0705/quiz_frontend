

import { Skeleton } from "@/components/ui/Skeleton";
import {
RankingSummarySkeleton,
MilestonesListSkeleton,
LeaderboardTableSkeleton,
RankingHistorySkeleton,
} from "@/features/rankings/components";

export default function RankingsLoading() {
return (
<main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
<header className="space-y-1">
<Skeleton className="h-7 w-40" />
<Skeleton className="h-4 w-72" />
</header>
<RankingSummarySkeleton />
<MilestonesListSkeleton />
<LeaderboardTableSkeleton />
<RankingHistorySkeleton />
</main>
  );
}