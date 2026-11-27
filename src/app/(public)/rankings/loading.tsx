import { Skeleton } from "@/components/ui/Skeleton";
import {
  RankingSummarySkeleton,
  MilestonesListSkeleton,
  LeaderboardTableSkeleton,
  RankingHistorySkeleton,
} from "@/features/rankings/components";

export default function RankingsLoading() {
  return (
    <main className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 space-y-6">
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
