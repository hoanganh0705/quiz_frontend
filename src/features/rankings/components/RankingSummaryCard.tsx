"use client";

/**
 * `RankingSummaryCard` — personal ranking summary surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.D1.
 *
 * ## What this component owns
 *
 * The personal summary card rendered on `/leaderboard` and embedded in
 * the personal area. Displays:
 *
 *   - The global rank (or "Unranked" when the user has no rank yet).
 *   - The total XP.
 *   - The freshness indicator (TKT-5.5.C3 `ConsistencyNotice`).
 *
 * ## Feature flag gating
 *
 * Renders `null` when `phase5_rankings === 'placeholder'`. The
 * `LeaderboardPage` falls back to a placeholder when the flag is off.
 *
 * ## Auth gating
 *
 * Renders `null` when the user is unauthenticated. The leaderboard is
 * a public page, but the personal summary is auth-gated.
 *
 * ## Loading / error / empty
 *
 * Delegates to the shared `RankingSummarySkeleton`,
 * `RankingEmptyState`, and `RankingErrorState` primitives.
 */

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useMyRanking } from "@/features/rankings/hooks";
import { ConsistencyNotice } from "@/features/rankings/components/shared/ConsistencyNotice";
import {
  RankingSummarySkeleton,
  RankingEmptyState,
  RankingErrorState,
} from "@/features/rankings/components/shared/RankingShared";

interface RankingSummaryCardProps {
  className?: string;
}

/**
 * Render the personal ranking summary.
 *
 * Returns `null` when:
 *
 *   - `phase5_rankings === 'placeholder'`.
 *   - The user is unauthenticated.
 *
 * Otherwise renders the summary with the freshness indicator.
 */
export function RankingSummaryCard({ className }: RankingSummaryCardProps) {
  const flagValue = getFeatureFlagValue("phase5_rankings");
  const isFlagPlaceholder = flagValue === "placeholder";

  const { bootstrapState, isAuthenticated } = useAuthBootstrap();

  const { summary, isLoading, error, retry, isStale, lastValidatedAt } =
    useMyRanking();

  if (isFlagPlaceholder) return null;
  if (!isAuthenticated && bootstrapState !== "bootstrapping") return null;

  if (isLoading && !summary) {
    return <RankingSummarySkeleton className={className} />;
  }

  if (error && !summary) {
    return (
      <RankingErrorState
        error={error}
        onRetry={() => void retry()}
        className={className}
      />
    );
  }

  if (!summary) {
    return (
      <RankingEmptyState
        variant="summary"
        className={className}
      />
    );
  }

  return (
    <section
      data-testid="ranking-summary-card"
      aria-label="Your ranking summary"
      className={`rounded-lg border bg-card p-4 sm:p-6 space-y-3 ${className ?? ""}`}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Your ranking</h2>
        <ConsistencyNotice
          isStale={isStale}
          lastValidatedAt={lastValidatedAt}
        />
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Global rank
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {summary.globalRank ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total XP
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {summary.totalScore.toLocaleString()}
          </p>
        </div>
      </div>
    </section>
  );
}