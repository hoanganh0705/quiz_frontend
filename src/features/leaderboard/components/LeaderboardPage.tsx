"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { useLeaderboard } from "@/features/leaderboard/hooks/useLeaderboard";
import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";
import { LeaderboardPeriodSelector } from "./LeaderboardPeriodSelector";
import { LeaderboardEntryRow } from "./LeaderboardEntryRow";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton";
import { LeaderboardEmptyState } from "./LeaderboardEmptyState";
import { getRankColor } from "@/features/leaderboard/lib/leaderboard-presentation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/shared/utils/merge-class-names";

const DEFAULT_PERIOD: LeaderboardPeriod = "weekly";

export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>(DEFAULT_PERIOD);

  const { isAuthenticated } = useAuthState();

  const {
    entries,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    retryBannerVisible,
  } = useLeaderboard(period);

  const handlePeriodChange = useCallback((next: LeaderboardPeriod) => {
    setPeriod(next);
  }, []);

  const handleRetry = useCallback(() => {
    void refresh();
  }, [refresh]);

  const isPeriodUnsupportedError =
    error instanceof ApiError && error.status === 404;
  const isServerError = error instanceof ApiError && error.status >= 500;
  const showErrorInline = isPeriodUnsupportedError;
  const showRetryBanner = isServerError || retryBannerVisible;

  // Infinite scroll trigger: loads more entries automatically as the user scrolls
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    if (typeof IntersectionObserver === "undefined") return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, loadMore]);

  return (
    <section
      className="space-y-6"
      aria-label="Global leaderboard"
      data-testid="leaderboard-page"
    >
      {/* Period selector — controlled by the composition */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Global leaderboard
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Realtime rankings based on earned experience points
          </p>
        </div>
        <LeaderboardPeriodSelector
          period={period}
          onChange={handlePeriodChange}
        />
      </div>

      {/* 404 inline error */}
      {showErrorInline ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-status-warning/30 bg-status-warning/10 p-4 text-sm text-status-warning"
          data-testid="leaderboard-404"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">This period isn&apos;t supported</p>
            <p className="mt-1 text-status-warning/80">
              Try selecting a different period above.
            </p>
          </div>
        </div>
      ) : null}

      {/* 5xx retry banner */}
      {showRetryBanner ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
          data-testid="leaderboard-5xx-banner"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <p>Something went wrong loading the leaderboard.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="border-destructive/50 text-destructive hover:bg-destructive/20"
          >
            Retry
          </Button>
        </div>
      ) : null}

      {/* Loading branch — skeleton on first paint and on period switch */}
      {isLoading ? (
        <LeaderboardSkeleton count={10} />
      ) : entries.length === 0 ? (
        <LeaderboardEmptyState
          onRetry={showRetryBanner ? handleRetry : undefined}
        />
      ) : (
        <div className="space-y-2">
          {/* Top 3 players as lines */}
          <Podium
            entries={entries.filter((e) => Number(e.rank) <= 3)}
            isAuthenticated={isAuthenticated}
          />
          {/* Players 4+ as lines */}
          <ol
            className="space-y-2 list-none"
            data-testid="leaderboard-rows"
            aria-label="Leaderboard entries"
          >
            {entries
              .filter((e) => Number(e.rank) > 3)
              .map((entry) => (
                <LeaderboardEntryRow
                  key={entry.userId}
                  entry={entry}
                  isAuthenticated={isAuthenticated}
                />
              ))}
          </ol>

          {/* Sentinel & fallback load more button for scroll pagination */}
          {hasMore ? (
            <div ref={sentinelRef} className="flex justify-center pt-3 pb-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={isLoadingMore}
                aria-busy={isLoadingMore}
                data-testid="leaderboard-load-more"
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground h-9 px-4 border-border/80 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin text-primary"
                      aria-hidden="true"
                    />
                    Loading more players…
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

interface PodiumProps {
  entries: ReturnType<typeof useLeaderboard>["entries"];
  isAuthenticated: boolean;
}

function Podium({ entries, isAuthenticated }: PodiumProps) {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => Number(a.rank) - Number(b.rank));

  return (
    <ol
      className="space-y-2 list-none"
      data-testid="leaderboard-podium"
      aria-label="Top 3 leaderboard entries"
    >
      {sorted.map((entry) => (
        <LeaderboardEntryRow
          key={entry.userId}
          entry={entry}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </ol>
  );
}
