import { Skeleton } from "@/components/ui/Skeleton";
import { BadgeGallerySkeleton } from "@/features/achievements/components";

export default function AchievementsLoading() {
  return (
    <main className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/40">
        <div className="flex items-start gap-3.5">
          <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex h-11 w-full sm:w-auto rounded-xl bg-muted/60 p-1 gap-1 border border-border/40">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <BadgeGallerySkeleton />
      </div>
    </main>
  );
}
