"use client";

import { AlertCircle } from "lucide-react";

import { ApiError } from "@/lib/api";

import { useDailyChallengeToday } from "@/features/daily-challenge/hooks/useDailyChallengeToday";
import { useDailyChallengeHistory } from "@/features/daily-challenge/hooks/useDailyChallengeHistory";
import { useDailyChallengeStreakView } from "@/features/daily-challenge/hooks/useDailyChallengeStreakView";
import {
  DailyChallengeCard,
  DailyChallengeCardSkeleton,
  DailyChallengeHistoryList,
  DailyChallengeHistorySkeleton,
  DailyChallengePlaceholder,
  DailyChallengePlaySurface,
  DailyChallengeStreakIndicator,
  InfoCard,
} from "@/features/daily-challenge/components";

import { cn } from "@/shared/utils/merge-class-names";

export interface DailyChallengePageProps {
  flagValue?: "v1" | "placeholder";
  className?: string;
}

function isTransient5xx(error: ApiError): boolean {
  return error.status >= 500;
}

export function DailyChallengePage({
  className,
}: DailyChallengePageProps) {
  const {
    challenge,
    isLoading: isTodayLoading,
    error: todayError,
    isMissingEndpoint: todayIsMissingEndpoint,
    refresh: refreshToday,
  } = useDailyChallengeToday();

  const {
    items,
    isLoading: isHistoryLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error: historyError,
  } = useDailyChallengeHistory();

  const { streak, isAuthenticated } = useDailyChallengeStreakView();

  const rootClassName = cn("space-y-6", className);
  const shouldRenderPlaceholder =
    todayIsMissingEndpoint;

  if (shouldRenderPlaceholder) {
    return (
      <div
        role="region"
        aria-label="Daily challenge"
        data-testid="daily-challenge-page-placeholder"
        className={className}
      >
        <DailyChallengePlaceholder />
      </div>
    );
  }

  if (isTodayLoading || isHistoryLoading) {
    return (
      <div
        role="region"
        aria-label="Daily challenge"
        aria-busy={true}
        data-testid="daily-challenge-page-skeleton"
        className={rootClassName}
      >
        <DailyChallengeCardSkeleton />
        <DailyChallengeHistorySkeleton />
      </div>
    );
  }

  const historyErrorRegion = historyError ? (
    <div
      role="alert"
      data-testid="daily-challenge-history-error"
      className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground"
    >
      <AlertCircle className="h-4 w-4 text-warning shrink-0" aria-hidden="true" />
      <span>
        History is unavailable right now. Today&apos;s challenge below is
        unaffected.
      </span>
    </div>
  ) : null;

  if (todayError) {
    const isTransient = isTransient5xx(todayError);
    const alertTestId = isTransient
      ? "daily-challenge-page-error"
      : "daily-challenge-page-error-inline";

    return (
      <div role="alert" data-testid={alertTestId} className={rootClassName}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border px-4 py-3 text-sm",
            isTransient
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-border bg-muted/50 text-foreground/80",
          )}
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>
            {isTransient
              ? "We're having trouble loading today's challenge. Please try again in a moment."
              : "Today's challenge isn't available right now. Please check back later."}
          </span>
        </div>
        {historyErrorRegion}
      </div>
    );
  }

  if (challenge === null) {
    return (
      <div
        role="region"
        aria-label="Daily challenge"
        data-testid="daily-challenge-page-empty"
        className={rootClassName}
      >
        <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-8 text-center text-sm text-foreground-secondary shadow-xs">
          No daily challenge today — check back tomorrow.
        </div>
        {historyErrorRegion}
        <DailyChallengeHistoryList
          items={items}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
        />
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Daily challenge"
      data-testid="daily-challenge-page-live"
      className={rootClassName}
    >
      {/* 1. Pulse Strip: 4 up-top vital status cards */}
      <InfoCard
        rewardXp={challenge.rewardXp}
        category={challenge.category}
        streak={streak}
        isAuthenticated={isAuthenticated}
      />

      {/* 2. Today's Featured Challenge */}
      <div className="space-y-3">
        {isAuthenticated && streak !== null ? (
          <div className="flex justify-end">
            <DailyChallengeStreakIndicator streak={streak} />
          </div>
        ) : null}
        <DailyChallengeCard
          challenge={challenge}
          isAuthenticated={isAuthenticated}
        />
      </div>

      {/* 3. Interactive Play Surface (directly below the challenge card!) */}
      {challenge.status === "pending" && isAuthenticated ? (
        <DailyChallengePlaySurface
          quizId={challenge.quizId}
          totalQuestions={challenge.totalQuestions}
          rewardXp={challenge.rewardXp}
          onTodayRefresh={refreshToday}
        />
      ) : null}

      {/* 4. History Region */}
      {historyErrorRegion}
      <DailyChallengeHistoryList
        items={items}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
      />
    </div>
  );
}
