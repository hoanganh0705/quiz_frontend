/**
 * `MyQuizzesAnalyticsTab` — aggregate analytics cards for the author's dashboard.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.D4.
 *
 * Renders 4 stat cards (Total Attempts, Total Reviews, Average Rating, Quizzes Published).
 * Conditionally renders:
 *   - `MyQuizzesAnalyticsSkeleton` while loading.
 *   - `MyQuizzesAnalyticsEmpty` when analytics is null or all numeric values are zero.
 *   - The 4 stat cards otherwise.
 *
 * ## Stat slots
 *
 * The epic (Story 4.4 line 434) specifies "total attempts, total reviews,
 * average rating across the user's quizzes". A 4th card (Quizzes Published)
 * adds useful context without over-fetching — `CreatorQuizAnalyticsDto` carries
 * `publishedQuizzes` so no extra request is needed.
 */

import { BarChart3, BookOpen, Star, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";

import type { MyQuizzesAnalytics } from "@/features/quizzes/types/my-quizzes";

import { MyQuizzesAnalyticsEmpty } from "./MyQuizzesAnalyticsEmpty";
import { MyQuizzesAnalyticsSkeleton } from "./MyQuizzesAnalyticsSkeleton";

interface MyQuizzesAnalyticsTabProps {
  /** The analytics data, or `null` while loading. */
  analytics: MyQuizzesAnalytics | null;
  /** True while the initial fetch is in flight. */
  isLoading: boolean;
}

/** Returns true when all numeric stats are zero. */
function isAllZero(a: MyQuizzesAnalytics): boolean {
  return (
    a.totalAttempts === 0 &&
    a.totalReviews === 0 &&
    a.publishedQuizzes === 0
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}

function StatCard({ icon: Icon, label, value }: StatCardProps): React.ReactElement {
  return (
    <Card>
      <CardContent className="flex flex-row items-center gap-4 pt-6">
        <div className="bg-muted rounded-lg p-3">
          <Icon className="text-muted-foreground h-5 w-5" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Format average rating to one decimal place, e.g. "4.2". */
function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Aggregate analytics cards for the author's dashboard.
 */
export function MyQuizzesAnalyticsTab({
  analytics,
  isLoading,
}: MyQuizzesAnalyticsTabProps): React.ReactElement {
  if (isLoading) {
    return <MyQuizzesAnalyticsSkeleton />;
  }

  if (!analytics || isAllZero(analytics)) {
    return <MyQuizzesAnalyticsEmpty />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        icon={TrendingUp}
        label="Total Attempts"
        value={analytics.totalAttempts.toLocaleString()}
      />
      <StatCard
        icon={BookOpen}
        label="Total Reviews"
        value={analytics.totalReviews.toLocaleString()}
      />
      <StatCard
        icon={Star}
        label="Average Rating"
        value={formatRating(analytics.averageRating)}
      />
      <StatCard
        icon={BarChart3}
        label="Quizzes Published"
        value={analytics.publishedQuizzes}
      />
    </div>
  );
}
