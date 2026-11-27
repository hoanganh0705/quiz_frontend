"use client";

import { getQueryClient } from "@/providers/QueryProvider";

import { Sparkline } from "@/components/primitives/Sparkline";
import { Button } from "@/components/ui/Button";

import { formatTimestamp } from "@/shared/utils/date-utils";

import { useTagAnalytics } from "@/features/tags/hooks/useTagAnalytics";
import { TAG_KEYS } from "@/features/tags/query-keys";

export interface TagAnalyticsPanelProps {
  id: string;

  className?: string;
}

export function TagAnalyticsPanel({
  id,
  className,
}: TagAnalyticsPanelProps): React.ReactElement {
  const { analytics, isLoading, error } = useTagAnalytics(id);

  if (isLoading) {
    return (
      <section
        aria-label="Tag analytics"
        aria-busy="true"
        data-testid="tag-analytics-panel-loading"
        className={className}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-md border bg-card p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-accent" />
            <div className="mt-2 h-6 w-32 animate-pulse rounded bg-accent" />
          </div>
          <div className="rounded-md border bg-card p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-accent" />
            <div className="mt-2 h-6 w-32 animate-pulse rounded bg-accent" />
          </div>
          <div className="rounded-md border bg-card p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-accent" />
            <div className="mt-2 h-6 w-32 animate-pulse rounded bg-accent" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-label="Tag analytics"
        data-testid="tag-analytics-panel-error"
        className={className}
      >
        <div className="text-center py-12" role="alert">
          <p className="text-destructive text-lg mb-4">
            Could not load tag analytics. Please try again.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              void getQueryClient().invalidateQueries({
                queryKey: TAG_KEYS.analytics(id),
              })
            }
            data-testid="tag-analytics-panel-retry"
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  if (!analytics) {
    return (
      <section
        aria-label="Tag analytics"
        data-testid="tag-analytics-panel-zero-state"
        className={className}
      >
        <div className="rounded-md border bg-card p-6 text-center">
          <h3 className="text-base font-semibold text-foreground mb-1">
            Analytics will populate after activity
          </h3>
          <p className="text-sm text-muted-foreground">
            Once quizzes carrying this tag start receiving attempts, analytics
            will appear here.
          </p>
        </div>
      </section>
    );
  }

  const sparklineValues = [analytics.summary.totalAttempts];

  return (
    <section
      aria-label="Tag analytics"
      data-testid="tag-analytics-panel"
      className={className}
    >
      <h2 className="text-lg font-semibold text-foreground mb-3">Analytics</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          className="rounded-md border bg-card p-4"
          data-testid="tag-analytics-panel-stat-attempts"
        >
          <div className="text-xs text-muted-foreground">Total attempts</div>
          <div className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
            {analytics.summary.totalAttempts.toLocaleString("en-US")}
          </div>
        </div>
        <div
          className="rounded-md border bg-card p-4"
          data-testid="tag-analytics-panel-stat-players"
        >
          <div className="text-xs text-muted-foreground">Unique players</div>
          <div className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
            {analytics.summary.uniquePlayers.toLocaleString("en-US")}
          </div>
        </div>
        <div
          className="rounded-md border bg-card p-4"
          data-testid="tag-analytics-panel-stat-rating"
        >
          <div className="text-xs text-muted-foreground">Average rating</div>
          <div className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
            {analytics.summary.averageRating.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4 rounded-md border bg-card p-4">
        <div>
          <div className="text-xs text-muted-foreground">Recent activity</div>
          <div className="mt-1 text-sm text-foreground">
            Last updated{" "}
            <time dateTime={analytics.lastUpdated}>
              {formatTimestamp(analytics.lastUpdated)}
            </time>
          </div>
        </div>
        {sparklineValues.length >= 2 ? (
          <Sparkline
            values={sparklineValues}
            width={120}
            height={32}
            className="text-muted-foreground"
            aria-label="Recent activity"
          />
        ) : null}
      </div>

      {analytics.topQuizzes.length > 0 ? (
        <div className="mt-4 rounded-md border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-2">
            Top quizzes by popularity
          </div>
          <ol
            className="space-y-1 text-sm text-foreground"
            data-testid="tag-analytics-panel-top-quizzes"
          >
            {analytics.topQuizzes.slice(0, 5).map((quiz) => (
              <li
                key={quiz.quizId}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  #{quiz.rank} {quiz.title}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {quiz.popularityScore.toFixed(2)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
