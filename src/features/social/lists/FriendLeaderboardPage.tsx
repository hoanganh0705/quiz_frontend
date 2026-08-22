"use client";

import { type ReactElement, useEffect, useRef } from "react";

import { useFriendLeaderboard } from "@/features/social/hooks/useFriendLeaderboard";
import { usePeriodFilter } from "@/features/social/hooks/usePeriodFilter";
import { useSocialLifecycleReset } from "@/features/social/hooks/useSocialLifecycleReset";

import { AnalyticsEmptyState } from "@/features/social/components/AnalyticsEmptyState";
import { AnalyticsErrorState } from "@/features/social/components/AnalyticsErrorState";
import { ConsistencyNotice } from "@/features/social/components/ConsistencyNotice";
import { FriendLeaderboardRow } from "@/features/social/components/FriendLeaderboardRow";
import { FriendLeaderboardSkeleton } from "@/features/social/components/FriendLeaderboardSkeleton";

import { addSocialLeaderboardBreadcrumb } from "@/lib/social/social-block-sentry";
import { mapAnalyticsPeriodToLeaderboardPeriod } from "@/features/social/types/analytics";

export function FriendLeaderboardPage(): ReactElement {
  const periodFilter = usePeriodFilter();
  useSocialLifecycleReset({ periodReset: periodFilter.reset });

  const {
    entries,
    currentUserRank,
    isLoading,
    isStale,
    error,
    retry,
    hasMore,
    loadMore,
    staleness,
  } = useFriendLeaderboard(periodFilter.period);

  const prevFetchRef = useRef<{
    state: "loading" | "ready" | "error";
    period: typeof periodFilter.period;
  } | null>(null);
  useEffect(() => {
    const next: "loading" | "ready" | "error" =
      error !== null && entries.length === 0
        ? "error"
        : entries.length > 0
          ? "ready"
          : "loading";
    if (
      prevFetchRef.current?.state === next &&
      prevFetchRef.current.period === periodFilter.period
    ) {
      return;
    }
    prevFetchRef.current = { state: next, period: periodFilter.period };
    addSocialLeaderboardBreadcrumb({
      offset: 0,
      limit: entries.length,
      total: entries.length,
      period: mapAnalyticsPeriodToLeaderboardPeriod(periodFilter.period),
      status: error !== null ? error.status : 200,
      code: error !== null ? error.code : undefined,
    });
  }, [entries, error, periodFilter.period]);

  if (isLoading && entries.length === 0) {
    return (
      <section
        data-testid="friend-leaderboard-page-loading"
        aria-label="Friend leaderboard"
        className="flex flex-col gap-3 p-6"
      >
        <h1 className="text-xl font-semibold">Friend leaderboard</h1>
        <FriendLeaderboardSkeleton />
      </section>
    );
  }

  if (
    error !== null &&
    entries.length === 0 &&
    error.code !== "SOCIAL_FRIEND_LIST_FORBIDDEN"
  ) {
    return (
      <section
        data-testid="friend-leaderboard-page-error"
        aria-label="Friend leaderboard"
        className="flex flex-col gap-3 p-6"
      >
        <h1 className="text-xl font-semibold">Friend leaderboard</h1>
        <AnalyticsErrorState
          error={error}
          isStale={isStale}
          onRetry={() => {
            retry();
          }}
        />
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section
        data-testid="friend-leaderboard-page-empty"
        aria-label="Friend leaderboard"
        className="flex flex-col gap-3 p-6"
      >
        <h1 className="text-xl font-semibold">Friend leaderboard</h1>
        <AnalyticsEmptyState kind="leaderboard" />
      </section>
    );
  }

  return (
    <section
      data-testid="friend-leaderboard-page"
      data-is-stale={isStale ? "true" : "false"}
      data-period={periodFilter.period}
      aria-label="Friend leaderboard"
      className="flex flex-col gap-3 p-6"
    >
      <h1 className="text-xl font-semibold">Friend leaderboard</h1>
      {staleness !== "fresh" ? (
        <ConsistencyNotice staleness={staleness} />
      ) : null}
      {currentUserRank != null ? (
        <div
          data-testid="friend-leaderboard-viewer-rank"
          className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm"
          aria-label="Your rank on this leaderboard"
        >
          <span className="font-semibold">Your rank:</span>{" "}
          <span className="tabular-nums">#{currentUserRank.rank}</span>{" "}
          <span className="text-foreground-secondary">
            ({currentUserRank.xp.toLocaleString()} XP)
          </span>
        </div>
      ) : null}
      <ul data-testid="friend-leaderboard-list" className="flex flex-col gap-1">
        {entries.map((entry) => {
          const key = `${entry.userId}-${entry.rank}`;
          return (
            <li key={key}>
              <FriendLeaderboardRow
                entry={entry}
                period={periodFilter.period}
              />
            </li>
          );
        })}
      </ul>
      {hasMore ? (
        <button
          type="button"
          onClick={() => {
            loadMore();
          }}
          data-testid="friend-leaderboard-page-load-more"
          className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Load more
        </button>
      ) : null}
    </section>
  );
}
