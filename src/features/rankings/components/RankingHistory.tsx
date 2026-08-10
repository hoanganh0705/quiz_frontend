"use client";

/**
 * `RankingHistory` — chronological ranking history list.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.D1.
 *
 * ## What this component owns
 *
 * Renders the authenticated user's ranking history (the daily rank
 * snapshot series) chronologically. Supports `loadMore` when more
 * entries are available.
 *
 * ## Auth gating
 *
 * Renders `null` when the user is unauthenticated. The history is
 * a private read.
 *
 * ## Feature flag gating
 *
 * Renders `null` when `rankings_live === 'placeholder'`. The page
 * falls back to a placeholder when the flag is off.
 *
 * ## Loading / error / empty
 *
 * Delegates to the shared `RankingHistorySkeleton`,
 * `RankingEmptyState`, and `RankingErrorState` primitives.
 */

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useRankingHistory } from "@/features/rankings/hooks";
import {
  RankingHistorySkeleton,
  RankingEmptyState,
  RankingErrorState,
} from "@/features/rankings/components/shared/RankingShared";

interface RankingHistoryProps {
  className?: string;
}

/**
 * Render the personal ranking history.
 *
 * Returns `null` when `rankings_live === 'placeholder'` or when the
 * user is unauthenticated.
 */
export function RankingHistory({ className }: RankingHistoryProps) {
  const flagValue = getFeatureFlagValue("rankings_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const { isAuthenticated, bootstrapState } = useAuthSession();

  const {
    items,
    isLoading,
    error,
    retry,
    isStale,
  } = useRankingHistory();

  if (isFlagPlaceholder) return null;
  if (!isAuthenticated && bootstrapState !== "bootstrapping") return null;

  if (isLoading && items.length === 0) {
    return <RankingHistorySkeleton className={className} />;
  }

  if (error && items.length === 0) {
    return (
      <RankingErrorState
        error={error}
        onRetry={() => void retry()}
        className={className}
      />
    );
  }

  if (items.length === 0) {
    return (
      <RankingEmptyState
        variant="history"
        className={className}
      />
    );
  }

  return (
    <section
      data-testid="ranking-history"
      aria-busy={isStale}
      aria-label="Ranking history"
      className={`rounded-lg border bg-card p-4 ${className ?? ""}`}
    >
      <h2 className="mb-3 text-sm font-semibold">Ranking history</h2>
      <ol
        className="divide-y divide-border"
        aria-label="Daily rank snapshots"
      >
        {items.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <span className="tabular-nums text-muted-foreground">
              {formatHistoryDate(entry.date)}
            </span>
            <span className="font-semibold tabular-nums">
              #{entry.rank ?? "—"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}