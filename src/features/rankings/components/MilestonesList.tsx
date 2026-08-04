"use client";

/**
 * `MilestonesList` — personal ranking milestones surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.D2.
 *
 * ## What this component owns
 *
 * Renders the authenticated user's ranking milestones grouped by
 * `period` (`weekly`, `monthly`, `all_time`). The documented subset
 * (`TOP_100`, `TOP_10`, `TOP_1`) is rendered with a trophy icon; the
 * other milestone codes (`TOP_10000`, `TOP_1000`, `TOP_50`, `TOP_3`)
 * are rendered but not styled as a milestone per the master plan.
 *
 * ## Auth gating
 *
 * Renders `null` when the user is unauthenticated.
 *
 * ## Feature flag gating
 *
 * Renders `null` when `phase5_rankings === 'placeholder'`.
 *
 * ## Loading / error / empty
 *
 * Delegates to the shared `MilestonesListSkeleton`,
 * `RankingEmptyState`, and `RankingErrorState` primitives. The empty
 * state is rendered when the user has no milestones yet ("No
 * milestones yet").
 */

import { Award, Trophy } from "lucide-react";

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useRankingMilestones } from "@/features/rankings/hooks";
import {
  MilestonesListSkeleton,
  RankingErrorState,
} from "@/features/rankings/components/shared/RankingShared";

interface MilestonesListProps {
  className?: string;
}

const FEATURED_MILESTONES = new Set(["TOP_100", "TOP_10", "TOP_1"]);

/**
 * Render the authenticated user's ranking milestones.
 *
 * Returns `null` when `phase5_rankings === 'placeholder'` or when the
 * user is unauthenticated.
 */
export function MilestonesList({ className }: MilestonesListProps) {
  const flagValue = getFeatureFlagValue("phase5_rankings");
  const isFlagPlaceholder = flagValue === "placeholder";

  const { isAuthenticated, bootstrapState } = useAuthBootstrap();

  const { milestones, isLoading, error, retry, isStale } =
    useRankingMilestones();

  if (isFlagPlaceholder) return null;
  if (!isAuthenticated && bootstrapState !== "bootstrapping") return null;

  if (isLoading && milestones.length === 0) {
    return <MilestonesListSkeleton className={className} />;
  }

  if (error && milestones.length === 0) {
    return (
      <RankingErrorState
        error={error}
        onRetry={() => void retry()}
        className={className}
      />
    );
  }

  if (milestones.length === 0) {
    return (
      <section
        data-testid="milestones-empty"
        aria-label="No milestones yet"
        className={`rounded-lg border bg-card p-6 ${className ?? ""}`}
      >
        <p className="text-sm text-muted-foreground">
          No milestones yet. Reach the top 100 on the global leaderboard
          to unlock your first milestone.
        </p>
      </section>
    );
  }

  // Milestones are a flat list at this commit — the DTO does not
  // expose a `period` field. Render in a single group.

  return (
    <section
      data-testid="milestones-list"
      aria-busy={isStale}
      aria-label="Ranking milestones"
      className={`space-y-3 ${className ?? ""}`}
    >
      <h2 className="text-sm font-semibold">Milestones</h2>
      <ul className="space-y-2">
        {milestones.map((m) => {
          const isFeatured = FEATURED_MILESTONES.has(m.milestone);
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              {isFeatured ? (
                <Trophy
                  aria-hidden="true"
                  className="h-8 w-8 shrink-0 text-amber-500"
                />
              ) : (
                <Award
                  aria-hidden="true"
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {humanizeMilestone(m.milestone)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Achieved {formatDate(m.achievedAt)}
                </p>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                #{m.rank}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MILESTONE_LABELS: Record<string, string> = {
  TOP_10000: "Top 10,000",
  TOP_1000: "Top 1,000",
  TOP_100: "Top 100",
  TOP_50: "Top 50",
  TOP_10: "Top 10",
  TOP_3: "Top 3",
  TOP_1: "Top 1",
};

function humanizeMilestone(code: string): string {
  return MILESTONE_LABELS[code] ?? code;
}

function formatDate(iso: string): string {
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