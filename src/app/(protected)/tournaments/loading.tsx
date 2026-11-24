import { Skeleton } from "@/components/ui/Skeleton";
import { TournamentListSkeleton } from "@/features/tournaments/components/shared";

export default function TournamentsLoading() {
  return (
    <div className="mx-auto max-w-7xl min-h-screen text-foreground px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header Skeleton */}
      <div className="border-b border-border/80 pb-6 space-y-1.5">
        <Skeleton className="h-9 sm:h-10 w-56 mb-1" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1.5 shrink-0">
          <Skeleton className="h-4 w-14" />
          <div className="flex h-9 items-center gap-1 p-1 rounded-md border border-border">
            <Skeleton className="h-full w-12 rounded-sm" />
            <Skeleton className="h-full w-20 rounded-sm" />
            <Skeleton className="h-full w-32 rounded-sm" />
            <Skeleton className="h-full w-16 rounded-sm" />
            <Skeleton className="h-full w-24 rounded-sm" />
          </div>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0 sm:min-w-[200px]">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>

      {/* Tournament Cards Grid Skeleton */}
      <TournamentListSkeleton count={8} />
    </div>
  );
}
