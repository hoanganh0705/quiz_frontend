import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import { Skeleton } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <div
      className={`${PAGE_CONTAINER_CLASS} space-y-6`}
      aria-busy="true"
      aria-label="Loading search"
    >
      <header className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </header>

      <Skeleton className="h-11 w-full max-w-2xl rounded-md" />

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
