"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertCircle,
  Loader2,
  LocateFixed,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

import { ApiError } from "@/lib/api";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { useLeaderboard } from "@/features/leaderboard/hooks/useLeaderboard";

import { Button } from "@/components/ui/Button";

import { LeaderboardEmptyState } from "./LeaderboardEmptyState";
import { LeaderboardEntryRow } from "./LeaderboardEntryRow";
import { LeaderboardPeriodSelector } from "./LeaderboardPeriodSelector";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton";

import type { SelectedPlayerPreview } from "@/features/leaderboard/hooks/usePlayerDossier";
import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";

const DEFAULT_PERIOD: LeaderboardPeriod = "weekly";

export interface LeaderboardSummarySnapshot {
  totalParticipants: number | null;
  resetInSeconds: number | null;
}

export interface LeaderboardPageProps {
  period?: LeaderboardPeriod;
  onPeriodChange?: (period: LeaderboardPeriod) => void;
  onSummaryChange?: (summary: LeaderboardSummarySnapshot) => void;
  onSelectPlayer?: (player: SelectedPlayerPreview) => void;
  hideInlinePeriodSelector?: boolean;
}

export function LeaderboardPage({
  period: controlledPeriod,
  onPeriodChange,
  onSummaryChange,
  onSelectPlayer,
  hideInlinePeriodSelector = false,
}: LeaderboardPageProps = {}) {
  const [internalPeriod, setInternalPeriod] =
    useState<LeaderboardPeriod>(DEFAULT_PERIOD);
  const [searchFilter, setSearchFilter] = useState("");
  const period = controlledPeriod ?? internalPeriod;

  const { isAuthenticated } = useAuthState();

  const {
    entries,
    totalParticipants = null,
    resetInSeconds = null,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    retryBannerVisible,
  } = useLeaderboard(period);

  useEffect(() => {
    if (!onSummaryChange) return;
    onSummaryChange({ totalParticipants, resetInSeconds });
  }, [onSummaryChange, resetInSeconds, totalParticipants]);

  const handlePeriodChange = useCallback(
    (next: LeaderboardPeriod) => {
      if (controlledPeriod === undefined) {
        setInternalPeriod(next);
      }
      onPeriodChange?.(next);
    },
    [controlledPeriod, onPeriodChange],
  );

  const handleRetry = useCallback(() => {
    void refresh();
  }, [refresh]);

  const isPeriodUnsupportedError =
    error instanceof ApiError && error.status === 404;
  const isServerError = error instanceof ApiError && error.status >= 500;
  const showErrorInline = isPeriodUnsupportedError;
  const showRetryBanner = isServerError || retryBannerVisible;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const standingsSectionRef = useRef<HTMLElement | null>(null);

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

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => Number(a.rank) - Number(b.rank)),
    [entries],
  );

  const leaderXp = useMemo(() => {
    if (sortedEntries.length === 0) return null;
    return Math.max(...sortedEntries.map((e) => Number(e.xp)));
  }, [sortedEntries]);

  const filteredEntries = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    if (!query) return sortedEntries;
    return sortedEntries.filter((entry) =>
      entry.displayName.toLowerCase().includes(query),
    );
  }, [sortedEntries, searchFilter]);

  const selfEntryInList = useMemo(() => {
    if (!isAuthenticated) return null;
    return sortedEntries.find((e) => e.isCurrentUser === true) ?? null;
  }, [sortedEntries, isAuthenticated]);

  const handleJumpToSelf = useCallback(() => {
    if (!selfEntryInList) return;
    setSearchFilter("");
    const root = standingsSectionRef.current ?? document;
    const el = root.querySelector(
      `[data-leaderboard-row="${selfEntryInList.userId}"]`,
    );
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selfEntryInList]);

  return (
    <section
      ref={standingsSectionRef}
      className="@container space-y-5"
      aria-label="Global leaderboard"
      data-testid="leaderboard-page"
    >
      {!hideInlinePeriodSelector ? (
        <div className="flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:justify-between border-b border-border/70 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Global leaderboard
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Realtime standings ranked by earned experience points
            </p>
          </div>
          <LeaderboardPeriodSelector
            period={period}
            onChange={handlePeriodChange}
          />
        </div>
      ) : null}

      {showErrorInline ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground"
          data-testid="leaderboard-404"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-warning"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">This period isn&apos;t supported</p>
            <p className="mt-1 text-muted-foreground">
              Try selecting a different period above.
            </p>
          </div>
        </div>
      ) : null}

      {showRetryBanner ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive @lg:flex-row @lg:items-center @lg:justify-between"
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
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <LeaderboardSkeleton count={10} />
      ) : sortedEntries.length === 0 ? (
        !showRetryBanner && !showErrorInline ? (
          <LeaderboardEmptyState />
        ) : null
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="flex flex-col gap-2.5 border-b border-border/70 bg-muted/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="relative flex-1 max-w-xs">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && searchFilter) {
                      e.preventDefault();
                      setSearchFilter("");
                    }
                  }}
                  placeholder="Filter loaded players…"
                  aria-label="Filter loaded players"
                  className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-8 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-default focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                {searchFilter.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSearchFilter("")}
                    aria-label="Clear player filter"
                    className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  Showing {filteredEntries.length} of {sortedEntries.length}{" "}
                  players
                </span>
                {selfEntryInList ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleJumpToSelf}
                    className="h-8 text-xs"
                  >
                    <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
                    Jump to #{selfEntryInList.rank}
                  </Button>
                ) : null}
              </div>
            </div>

            <div
              aria-hidden="true"
              className="flex items-center justify-between gap-3 sm:gap-4 border-b border-border/60 bg-muted/40 px-3 py-2 sm:px-4 text-xs font-medium text-muted-foreground"
            >
              <div className="flex flex-1 items-center gap-3 sm:gap-4">
                <span className="w-14 sm:w-16 text-right">Rank</span>
                <span>Player</span>
              </div>
              <span className="hidden @lg:block w-28 @2xl:w-36 text-right">
                Gap / Pace
              </span>
              <span className="min-w-[5.5rem] sm:min-w-[6.75rem] text-right">
                XP
              </span>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  No loaded players match &ldquo;{searchFilter}&rdquo;
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Clear the filter or load more standings below.
                </p>
              </div>
            ) : (
              <ol
                start={1}
                className="divide-y divide-border/50 list-none"
                data-testid="leaderboard-rows"
                aria-label="Leaderboard entries"
              >
                {filteredEntries.map((entry) => (
                  <LeaderboardEntryRow
                    key={entry.userId}
                    entry={entry}
                    isAuthenticated={isAuthenticated}
                    leaderXp={leaderXp}
                    onSelectPlayer={onSelectPlayer}
                  />
                ))}
              </ol>
            )}
          </div>

          {hasMore ? (
            <div ref={sentinelRef} className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={isLoadingMore}
                aria-busy={isLoadingMore}
                data-testid="leaderboard-load-more"
                className="min-h-10 sm:min-h-9 px-5 text-xs sm:text-sm text-muted-foreground hover:text-foreground border-border/80"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin text-brand motion-reduce:animate-none"
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
