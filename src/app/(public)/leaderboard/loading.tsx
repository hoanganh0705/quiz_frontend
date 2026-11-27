import { Skeleton } from "@/components/ui/Skeleton";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

export default function LeaderboardLoading() {
  return (
    <div
      className={PAGE_CONTAINER_CLASS}
      aria-busy="true"
      aria-label="Loading leaderboard page"
    >
      <div className="@container space-y-6 md:space-y-8">
        <div className="space-y-4">
          <header className="flex flex-col gap-3 @2xl:flex-row @2xl:items-end @2xl:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 md:h-9 w-44" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-36 rounded-full" />
            </div>
          </header>

          <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:justify-between rounded-xl border border-border bg-card p-2 sm:p-2.5">
            <Skeleton className="h-9 w-full @2xl:w-52 rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-60 rounded-md" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <section
            className="lg:col-span-8 @container space-y-4"
            aria-label="Global leaderboard"
            aria-busy="true"
          >
            <div
              role="status"
              aria-live="polite"
              aria-label="Loading leaderboard"
              className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/50"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/25">
                <Skeleton className="h-8 w-56 rounded-md" />
                <Skeleton className="h-4 w-32" />
              </div>
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 px-3 py-3 sm:px-4"
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <Skeleton className="h-7 w-12 sm:w-14 rounded-full shrink-0" />
                    <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <Skeleton className="hidden lg:block h-4 w-28 shrink-0" />
                  <Skeleton className="h-4 w-20 shrink-0" />
                </div>
              ))}
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-9 w-full rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-full rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-11 w-full rounded-lg" />
                <Skeleton className="h-11 w-full rounded-lg" />
                <Skeleton className="h-11 w-full rounded-lg" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
