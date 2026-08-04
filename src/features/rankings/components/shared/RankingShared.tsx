"use client";

/**
 * `RankingShared` — loading/empty/error skeletons and empty states
 * for ranking surfaces.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.D1 (skeletons, empty, error).
 *
 * Provides matching shape skeletons so the route-skeleton-to-live
 * swap is CLS-zero for the Story 5.5 ranking components.
 *
 * The skeletons are intentionally minimal — each ranking surface
 * (`RankingSummaryCard`, `LeaderboardTable`, `RankingHistory`) chooses
 * how many rows / fields to render.
 */

import { BarChart3, Calendar, Trophy } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/loading-states/ErrorState";

import type { ApiError } from "@/lib/api";

// ─── Summary skeleton ──────────────────────────────────────────────────────

interface RankingSummarySkeletonProps {
  className?: string;
}

/**
 * Skeleton matching the `RankingSummaryCard` outer dimensions:
 * title row, two stat blocks, freshness row.
 */
export function RankingSummarySkeleton({ className }: RankingSummarySkeletonProps) {
  return (
    <div
      data-testid="ranking-summary-skeleton"
      className={`rounded-lg border bg-card p-4 sm:p-6 space-y-3 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-44" />
    </div>
  );
}

// ─── Leaderboard table skeleton ────────────────────────────────────────────

interface LeaderboardTableSkeletonProps {
  /** Number of skeleton rows to render. Defaults to 10. */
  rows?: number;
  className?: string;
}

/**
 * Skeleton for the `LeaderboardTable`. Matches the outer chrome
 * (card border, space-y-1, p-2 inner padding) and renders `rows`
 * placeholder rows with the rank/name/xp/avatar columns.
 */
export function LeaderboardTableSkeleton({
  rows = 10,
  className,
}: LeaderboardTableSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading leaderboard"
      data-testid="leaderboard-table-skeleton"
      className={`rounded-lg border bg-card overflow-hidden ${className ?? ""}`}
    >
      <div className="space-y-1 p-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2 rounded-md"
          >
            <Skeleton className="h-6 w-10 shrink-0" />
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── History skeleton ──────────────────────────────────────────────────────

interface RankingHistorySkeletonProps {
  rows?: number;
  className?: string;
}

/**
 * Skeleton matching `RankingHistory`. Renders `rows` placeholder
 * entries (date + rank bars).
 */
export function RankingHistorySkeleton({
  rows = 6,
  className,
}: RankingHistorySkeletonProps) {
  return (
    <div
      data-testid="ranking-history-skeleton"
      className={`rounded-lg border bg-card p-4 space-y-3 ${className ?? ""}`}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

// ─── Milestones skeleton ───────────────────────────────────────────────────

interface MilestonesListSkeletonProps {
  rows?: number;
  className?: string;
}

/**
 * Skeleton matching `MilestonesList`. Renders `rows` milestone cards.
 */
export function MilestonesListSkeleton({
  rows = 3,
  className,
}: MilestonesListSkeletonProps) {
  return (
    <div
      data-testid="milestones-list-skeleton"
      className={`space-y-2 ${className ?? ""}`}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border bg-card p-3"
        >
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────

interface RankingEmptyStateProps {
  variant: "leaderboard" | "history" | "summary";
  className?: string;
}

const RANKING_EMPTY_CONFIG = {
  leaderboard: {
    icon: Trophy,
    title: "No leaderboard data",
    description:
      "The leaderboard will populate as more players complete quizzes. Check back soon.",
  },
  history: {
    icon: Calendar,
    title: "No ranking history yet",
    description:
      "Your daily rank snapshots will appear here once you have completed more quizzes.",
  },
  summary: {
    icon: BarChart3,
    title: "No rankings yet",
    description:
      "Complete a few quizzes to see where you rank against other players.",
  },
} as const;

/**
 * Empty-state block for ranking surfaces. The variant selects the
 * icon and copy. Components never claim a fabricated value here.
 */
export function RankingEmptyState({
  variant,
  className,
}: RankingEmptyStateProps) {
  const config = RANKING_EMPTY_CONFIG[variant];
  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      size="sm"
      className={className}
      data-testid={`ranking-empty-${variant}`}
    />
  );
}

// ─── Error state ───────────────────────────────────────────────────────────

interface RankingErrorStateProps {
  error: ApiError | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Error-state block for ranking surfaces. Uses the shared
 * `ErrorState` primitive and branches on the typed `ApiError.code`.
 */
export function RankingErrorState({
  error,
  onRetry,
  className,
}: RankingErrorStateProps) {
  // The runtime `ErrorCode` union does not include `RANKING_NOT_FOUND`
  // at this commit; widen the literal to `string` so the runtime check
  // works without a type error.
  const code = String(error?.code ?? "");
  const variant =
    code === "RANKING_NOT_FOUND" || error?.status === 404
      ? "notFound"
      : error?.status === 0
        ? "network"
        : "server";
  return (
    <ErrorState
      variant={variant}
      onRetry={onRetry}
      className={className}
      data-testid="ranking-error-state"
      title={error ? "Could not load rankings" : undefined}
      message={
        error ? (error.detail || error.message || undefined) : undefined
      }
    />
  );
}