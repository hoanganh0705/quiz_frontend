import { Skeleton } from "@/components/ui/Skeleton";
import { CategoryCardSkeleton } from "@/components/primitives";

export default function CategoriesLoading() {
  return (
    <div className="mx-auto max-w-7xl min-h-screen text-foreground px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      {/* Trending Rail Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <div className="flex gap-4 overflow-hidden pb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-64 shrink-0">
              <CategoryCardSkeleton />
            </div>
          ))}
        </div>
      </div>

      {/* Categories Grid Skeleton */}
      <div className="space-y-6 pt-6 border-t border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-4">
          <div className="space-y-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-9 w-full sm:w-72 lg:w-80 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
