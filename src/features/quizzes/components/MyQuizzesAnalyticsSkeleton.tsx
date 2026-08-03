/**
 * `MyQuizzesAnalyticsSkeleton` — loading state for the analytics cards tab.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.C3.
 *
 * Renders 4 animated skeleton cards matching the 4 stat slots in
 * `MyQuizzesAnalyticsTab`. Used while `useMyQuizzesAnalytics` is loading.
 */

import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

const CARD_COUNT = 4 as const;

function SkeletonCard(): React.ReactElement {
  return (
    <Card>
      <CardContent className="pt-6">
        <Skeleton className="mb-2 h-3 w-24 rounded" />
        <Skeleton className="h-8 w-16 rounded" />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader for the author's analytics cards.
 * Renders 4 animated cards while data is fetching.
 */
export function MyQuizzesAnalyticsSkeleton(): React.ReactElement {
  return (
    <div
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading analytics"
    >
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
