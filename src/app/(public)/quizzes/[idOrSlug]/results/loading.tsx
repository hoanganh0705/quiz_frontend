import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import { Skeleton } from "@/components/ui/Skeleton";

export default function QuizResultsLoading() {
  return (
    <div
      className={`${PAGE_CONTAINER_CLASS} space-y-6`}
      aria-busy="true"
      aria-label="Loading quiz results"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
