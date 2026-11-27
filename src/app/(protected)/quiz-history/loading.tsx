import { Skeleton } from "@/components/ui/Skeleton";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

export default function QuizHistoryLoading() {
  return (
    <main
      className={PAGE_CONTAINER_CLASS}
      aria-busy="true"
      aria-label="Loading quiz history"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-9 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <div className="rounded-xl border border-border/70 bg-card/70 p-3.5 sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
            <div className="space-y-1.5 sm:w-44">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-10 sm:h-9 w-full rounded-md" />
            </div>
            <div className="space-y-1.5 sm:w-44">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 sm:h-9 w-full rounded-md" />
            </div>
            <div className="col-span-2 space-y-1.5 sm:flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 sm:h-9 w-full rounded-md" />
            </div>
            <Skeleton className="col-span-2 h-10 sm:h-9 sm:w-20 rounded-md" />
          </div>
        </div>

        <div
          className="overflow-hidden rounded-xl border border-border/70 bg-card divide-y divide-border/60"
          aria-hidden="true"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 px-4 py-3.5"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-48 max-w-[65%]" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-36" />
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
