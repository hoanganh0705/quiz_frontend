import { BarChart3, BookOpen, Star, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/shared/utils/merge-class-names";

import type { MyQuizzesAnalytics } from "@/features/quizzes/types/my-quizzes";

import { MyQuizzesAnalyticsEmpty } from "./MyQuizzesAnalyticsEmpty";
import { MyQuizzesAnalyticsSkeleton } from "./MyQuizzesAnalyticsSkeleton";

interface MyQuizzesAnalyticsTabProps {
  analytics: MyQuizzesAnalytics | null;

  isLoading: boolean;
}

function isAllZero(a: MyQuizzesAnalytics): boolean {
  return (
    a.totalAttempts === 0 && a.totalReviews === 0 && a.publishedQuizzes === 0
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accentClass: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  accentClass,
}: StatCardProps): React.ReactElement {
  return (
    <Card className="rounded-xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("shrink-0 rounded-xl p-3", accentClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums sm:text-3xl">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRating(rating: number): string {
  return rating.toFixed(1);
}

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={TrendingUp}
        label="Total Attempts"
        value={analytics.totalAttempts.toLocaleString()}
        accentClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      />
      <StatCard
        icon={BookOpen}
        label="Total Reviews"
        value={analytics.totalReviews.toLocaleString()}
        accentClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
      />
      <StatCard
        icon={Star}
        label="Average Rating"
        value={formatRating(analytics.averageRating)}
        accentClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />
      <StatCard
        icon={BarChart3}
        label="Quizzes Published"
        value={analytics.publishedQuizzes}
        accentClass="bg-default/10 text-default dark:text-default"
      />
    </div>
  );
}
