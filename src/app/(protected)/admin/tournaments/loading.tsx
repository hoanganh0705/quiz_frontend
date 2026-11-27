import { Skeleton } from "@/components/ui/Skeleton";
import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

export default function AdminTournamentsLoading() {
  return (
    <div
      className={PAGE_CONTAINER_CLASS}
      role="status"
      aria-busy="true"
      aria-label="Loading tournaments"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 sm:h-9 w-36 rounded-md" />
      </header>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-muted/20 px-4 py-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center flex-1">
            <Skeleton className="h-10 sm:h-9 w-full sm:max-w-xs md:max-w-sm rounded-md" />
            <Skeleton className="h-10 sm:h-9 w-full sm:w-44 rounded-md" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="hidden lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_6.5rem_5.5rem_7.5rem_2.5rem] lg:items-center lg:gap-4 border-b border-border bg-muted/10 px-4 py-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-10 ml-auto" />
        </div>

        <div className="divide-y divide-border/60">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-2.5 px-4 py-3.5 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_6.5rem_5.5rem_7.5rem_2.5rem] lg:items-center lg:gap-4"
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-64 max-w-full" />
                </div>
                <Skeleton className="h-10 w-10 rounded-md shrink-0 lg:hidden" />
              </div>
              <Skeleton className="h-3.5 w-44 max-w-full" />
              <div className="flex items-center gap-2 lg:contents">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="hidden lg:block h-9 w-9 rounded-md ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
