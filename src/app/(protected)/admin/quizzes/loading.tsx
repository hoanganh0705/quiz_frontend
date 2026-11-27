import { Skeleton } from "@/components/ui/Skeleton";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { cn } from "@/shared/utils/merge-class-names";

export default function AdminQuizzesLoading() {
  return (
    <div
      className={cn(PAGE_CONTAINER_CLASS, "space-y-6")}
      role="status"
      aria-busy="true"
      aria-label="Loading quizzes"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 sm:h-9 w-32 rounded-md" />
      </header>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-border bg-muted/20 px-4 py-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center flex-1">
            <Skeleton className="h-10 sm:h-9 w-full sm:max-w-xs rounded-md" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-9 sm:h-8 w-12 rounded-md" />
              <Skeleton className="h-9 sm:h-8 w-20 rounded-md" />
              <Skeleton className="h-9 sm:h-8 w-16 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 sm:h-8 w-22 rounded-md" />
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="px-4 py-3 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_172px_140px_112px_136px] lg:items-center lg:gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <div className="flex items-center lg:justify-end gap-2">
                <Skeleton className="h-9 sm:h-8 w-16 rounded-md" />
                <Skeleton className="h-9 sm:h-8 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
