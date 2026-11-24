import { Skeleton } from "@/components/ui/Skeleton";

export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen py-6 px-4 sm:py-8 sm:px-6 md:py-10 md:px-8">
      <div className="max-w-6xl mx-auto w-full space-y-8 sm:space-y-10">
        {/* Header skeleton — matches LeaderboardHeader outer dimensions */}
        <div className="space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-6">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex flex-wrap gap-2.5 items-center">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
          </header>

          {/* Stats Overview — 4-col grid matching the live LeaderboardHeader stats */}
          <section
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            aria-label="Leaderboard statistics overview"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-card/80 p-4 sm:p-5 rounded-2xl border border-border/70"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-3.5 w-24 mb-2" />
                    <Skeleton className="h-7 w-20" />
                  </div>
                  <Skeleton className="h-11 w-11 rounded-xl" />
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* 2-column middle section — matches CompetitionStats + LeaderboardHighlights */}
        <section
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
          aria-label="Leaderboard statistics"
        >
          {/* CompetitionStats skeleton */}
          <div className="col-span-1 p-5 sm:p-6 bg-card/80 border border-border/70 rounded-2xl shadow-xs space-y-4">
            <div className="space-y-1.5 pb-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex justify-between items-center py-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>

          {/* LeaderboardHighlights skeleton — matches tabs, visual pedestal, and stat boxes */}
          <div className="col-span-1 lg:col-span-2 p-5 sm:p-6 bg-card/80 border border-border/70 rounded-2xl shadow-xs space-y-5">
            <div className="space-y-1.5 pb-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>

            {/* Tab strip + filters skeleton */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <Skeleton className="h-9 w-64 rounded-xl" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>

            {/* Podium skeleton — matches live GlobalTab top-3 pedestal */}
            <div className="flex items-end justify-center gap-2.5 sm:gap-4 pt-2">
              {/* 2nd place */}
              <div className="flex-1 max-w-[130px] sm:max-w-[160px] flex flex-col items-center p-3 sm:p-4 rounded-2xl border border-slate-400/20 bg-slate-400/5">
                <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-full mb-2" />
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-14" />
              </div>
              {/* 1st place — taller and offset */}
              <div className="flex-1 max-w-[140px] sm:max-w-[180px] flex flex-col items-center p-3.5 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 -mt-4 sm:-mt-6">
                <Skeleton className="h-5 w-5 rounded-full mb-1" />
                <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full mb-2" />
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              {/* 3rd place */}
              <div className="flex-1 max-w-[130px] sm:max-w-[160px] flex flex-col items-center p-3 sm:p-4 rounded-2xl border border-amber-700/20 bg-amber-700/5 mt-2 sm:mt-4">
                <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-full mb-2" />
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>

            {/* 4 summary stats boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-border/60 bg-card/60 text-center space-y-1"
                >
                  <Skeleton className="h-5 w-16 mx-auto" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Global Leaderboard section — matches LeaderboardPage title + horizontal row cards */}
        <section
          className="mt-6 space-y-6"
          aria-label="Global leaderboard"
          aria-busy="true"
        >
          {/* Section header skeleton */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/80">
            <div className="space-y-1">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-3.5 w-64" />
            </div>
            <Skeleton className="h-9 w-64 rounded-xl" />
          </div>

          {/* Table rows skeleton — individual row cards matching LeaderboardEntryRow */}
          <div
            role="status"
            aria-live="polite"
            aria-label="Loading leaderboard"
            className="space-y-2"
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 rounded-xl p-3 sm:px-4 border border-border/70 bg-card/80 shadow-2xs"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  <div className="flex min-w-[3.25rem] shrink-0 flex-col items-center gap-1">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-3 w-6" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1 max-w-xs">
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
