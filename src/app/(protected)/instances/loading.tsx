import { Skeleton } from "@/components/ui/Skeleton";
import { InstanceListSkeleton } from "@/features/instances/components/InstanceListSkeleton";

export default function InstancesLoading() {
  return (
    <main className="mx-auto max-w-7xl min-h-screen text-foreground px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72 mb-1" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Grid Skeleton */}
      <InstanceListSkeleton count={6} />
    </main>
  );
}
