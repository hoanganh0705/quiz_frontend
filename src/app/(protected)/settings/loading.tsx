import { Skeleton } from "@/components/ui/Skeleton";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { cn } from "@/shared/utils/merge-class-names";

export default function SettingsLoading() {
  return (
    <div
      className={cn(PAGE_CONTAINER_CLASS, "space-y-8")}
      aria-busy="true"
      aria-label="Loading settings"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 sm:h-9 w-44 rounded-md" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
        <div className="rounded-xl border border-border bg-card p-1.5 grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col gap-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-md" />
          ))}
        </div>

        <div className="min-w-0 w-full space-y-6">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>

          <div className="p-6 border border-border bg-card rounded-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start gap-5 pb-6 border-b border-border/60">
              <Skeleton className="h-20 w-20 rounded-full shrink-0" />
              <div className="flex-1 space-y-2 w-full">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-9 w-64 max-w-full rounded-md" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60 flex justify-end">
              <Skeleton className="h-10 sm:h-9 w-32 rounded-md" />
            </div>
          </div>

          <div className="p-5 border border-border bg-card rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
            <Skeleton className="h-10 sm:h-9 w-48 rounded-md shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
