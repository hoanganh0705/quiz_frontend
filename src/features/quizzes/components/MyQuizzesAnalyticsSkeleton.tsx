import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

const CARD_COUNT = 4 as const;

function SkeletonCard(): React.ReactElement {
  return (
    <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
      <CardContent className="flex items-center gap-4 p-5">
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-7 w-16 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MyQuizzesAnalyticsSkeleton(): React.ReactElement {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading analytics"
    >
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
