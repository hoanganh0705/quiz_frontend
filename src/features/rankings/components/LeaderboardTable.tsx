"use client";

/**
 * `LeaderboardTable` — global leaderboard table surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.D1.
 *
 * ## What this component owns
 *
 * Renders the global leaderboard as a table:
 *
 *   - Ties render in the order returned by the backend (no client-side
 *     reordering; the ticket locks this — D1 AC #2).
 *   - The current user's row is highlighted when
 *     `entry.isCurrentUser === true`.
 *   - A `loadMore` button appears when `hasMore` is `true`; it calls
 *     the `loadMore()` action exposed by `useRankingLeaderboard`.
 *
 * ## Period filter
 *
 * The component takes a `period` prop and forwards it to the hook.
 * Filter changes reset pagination to the first offset (the hook's
 * SWR key includes the period).
 *
 * ## Feature flag gating
 *
 * Renders `null` when `rankings_live === 'placeholder'`. The page
 * falls back to a placeholder when the flag is off.
 *
 * ## Loading / error / empty
 *
 * Delegates to the shared `LeaderboardTableSkeleton`,
 * `RankingEmptyState`, and `RankingErrorState` primitives.
 */

import { Crown } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useRankingLeaderboard } from "@/features/rankings/hooks";
import type {
  RankingLeaderboardEntry,
  RankingPeriod,
} from "@/features/rankings/types";
import {
  LeaderboardTableSkeleton,
  RankingEmptyState,
  RankingErrorState,
} from "@/features/rankings/components/shared/RankingShared";

interface LeaderboardTableProps {
  /** Period filter. `undefined` means "all periods". */
  period?: RankingPeriod;
  /** Page size forwarded to the hook. */
  limit?: number;
  className?: string;
}

/**
 * Render the global leaderboard table.
 *
 * Returns `null` when `rankings_live === 'placeholder'`. Renders the
 * skeleton / error / empty states through the shared primitives.
 */
export function LeaderboardTable({
  period,
  limit,
  className,
}: LeaderboardTableProps) {
  const flagValue = getFeatureFlagValue("rankings_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // Always call the hook so the Rules of Hooks are satisfied even when
  // the flag is off. The hook short-circuits internally and returns a
  // safe fallback in that case.
  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    isStale,
  } = useRankingLeaderboard({ period, limit });

  if (isFlagPlaceholder) return null;

  if (isLoading && items.length === 0) {
    return <LeaderboardTableSkeleton className={className} />;
  }

  if (error && items.length === 0) {
    return (
      <RankingErrorState
        error={error}
        onRetry={() => void refresh()}
        className={className}
      />
    );
  }

  if (items.length === 0) {
    return (
      <RankingEmptyState
        variant="leaderboard"
        className={className}
      />
    );
  }

  return (
    <section
      data-testid="leaderboard-table"
      aria-busy={isStale || isLoadingMore}
      aria-label="Global leaderboard"
      className={`rounded-lg border bg-card overflow-hidden ${className ?? ""}`}
    >
      <ol
        className="divide-y divide-border"
        aria-label="Leaderboard rankings"
      >
        {items.map((entry) => (
          <LeaderboardRow key={entry.id} entry={entry} />
        ))}
      </ol>

      {hasMore ? (
        <div className="flex justify-center border-t p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMore()}
            disabled={isLoadingMore}
            aria-label="Load more leaderboard entries"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────

interface LeaderboardRowProps {
  entry: RankingLeaderboardEntry;
}

function LeaderboardRow({ entry }: LeaderboardRowProps) {
  const isYou = entry.isCurrentUser === true;
  return (
    <li
      data-testid={`leaderboard-row-${entry.userId}`}
      className={
        isYou
          ? "flex items-center gap-3 px-3 py-2 bg-primary/5 ring-1 ring-primary/30"
          : "flex items-center gap-3 px-3 py-2 hover:bg-muted/40"
      }
    >
      <span
        aria-label={`Rank ${entry.rank}`}
        className="inline-flex h-6 w-10 items-center justify-center rounded text-xs font-semibold tabular-nums text-muted-foreground"
      >
        {entry.denseRank === 1 ? (
          <Crown
            aria-hidden="true"
            className="h-3.5 w-3.5 text-amber-500"
          />
        ) : null}
        {entry.rank}
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium">
          {entry.displayName}
        </span>
        {isYou ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            You
          </span>
        ) : null}
        {entry.isTied ? (
          <span className="text-[10px] text-muted-foreground">tied</span>
        ) : null}
      </div>

      <span
        aria-label={`${entry.xp} XP`}
        className="shrink-0 text-sm tabular-nums text-muted-foreground"
      >
        {entry.xp.toLocaleString()} XP
      </span>
    </li>
  );
}