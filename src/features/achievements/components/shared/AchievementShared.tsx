"use client";

/**
 * `AchievementShared` — loading/empty/error skeletons and empty states
 * for achievement surfaces.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.D3 / D4 (skeletons, empty, error).
 *
 * The skeletons match the route-skeleton-to-live CLS-zero pattern
 * used by the existing Phase 4 / Phase 5 surfaces.
 */

import { Award, History, Sparkles } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/loading-states/ErrorState";

import type { ApiError } from "@/lib/api";

// ─── Badge card skeleton ───────────────────────────────────────────────────

interface BadgeCardSkeletonProps {
  className?: string;
}

/**
 * Skeleton for a single badge card. Used by the catalog gallery and
 * the earned-badges list.
 */
export function BadgeCardSkeleton({ className }: BadgeCardSkeletonProps) {
  return (
    <div
      data-testid="badge-card-skeleton"
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${className ?? ""}`}
    >
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

// ─── Badge gallery skeleton ────────────────────────────────────────────────

interface BadgeGallerySkeletonProps {
  /** Number of skeleton cards. Defaults to 6. */
  count?: number;
  className?: string;
}

/**
 * Skeleton for the `BadgeGallery` — `count` cards arranged in a
 * 2-col grid.
 */
export function BadgeGallerySkeleton({
  count = 6,
  className,
}: BadgeGallerySkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading badge catalog"
      data-testid="badge-gallery-skeleton"
      className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className ?? ""}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <BadgeCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Badge detail skeleton ─────────────────────────────────────────────────

interface BadgeDetailSkeletonProps {
  className?: string;
}

/**
 * Skeleton matching the `BadgeDetail` outer dimensions.
 */
export function BadgeDetailSkeleton({ className }: BadgeDetailSkeletonProps) {
  return (
    <div
      data-testid="badge-detail-skeleton"
      className={`space-y-4 ${className ?? ""}`}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

// ─── Earned-badges skeleton ─────────────────────────────────────────────────

interface EarnedBadgeListSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Skeleton for the `EarnedBadgeList` — `count` rows with progress
 * bars.
 */
export function EarnedBadgeListSkeleton({
  count = 4,
  className,
}: EarnedBadgeListSkeletonProps) {
  return (
    <div
      data-testid="earned-badge-list-skeleton"
      className={`space-y-2 ${className ?? ""}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border bg-card p-3"
        >
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── History skeleton ──────────────────────────────────────────────────────

interface AchievementHistorySkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Skeleton for `AchievementHistory` — `count` rows.
 */
export function AchievementHistorySkeleton({
  count = 6,
  className,
}: AchievementHistorySkeletonProps) {
  return (
    <div
      data-testid="achievement-history-skeleton"
      className={`space-y-2 ${className ?? ""}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border bg-card p-3"
        >
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty states ──────────────────────────────────────────────────────────

interface AchievementEmptyStateProps {
  variant: "catalog" | "earned" | "history";
  className?: string;
}

const ACHIEVEMENT_EMPTY_CONFIG = {
  catalog: {
    icon: Sparkles,
    title: "No badges available",
    description:
      "The badge catalog is currently empty. Check back later for new achievements to earn.",
  },
  earned: {
    icon: Award,
    title: "No badges earned yet",
    description:
      "Complete quizzes, participate in tournaments, and engage with the community to earn your first badge.",
  },
  history: {
    icon: History,
    title: "No achievement history yet",
    description:
      "Your earned badges will appear here once you start collecting achievements.",
  },
} as const;

/**
 * Empty-state block for achievement surfaces. The variant selects
 * the icon and copy.
 */
export function AchievementEmptyState({
  variant,
  className,
}: AchievementEmptyStateProps) {
  const config = ACHIEVEMENT_EMPTY_CONFIG[variant];
  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      size="sm"
      className={className}
      data-testid={`achievement-empty-${variant}`}
    />
  );
}

// ─── Error state ───────────────────────────────────────────────────────────

interface AchievementErrorStateProps {
  error: ApiError | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Error-state block for achievement surfaces.
 *
 * Branches on `error.code` for `BADGE_HIDDEN` (renders a privacy-aware
 * empty state instead of a generic error). For other errors, falls
 * back to the shared `ErrorState` primitive with the typed status.
 */
export function AchievementErrorState({
  error,
  onRetry,
  className,
}: AchievementErrorStateProps) {
  const code = String(error?.code ?? "");
  const variant =
    error?.status === 0
      ? "network"
      : error?.status && error.status >= 500
        ? "server"
        : "default";
  return (
    <ErrorState
      variant={variant}
      onRetry={onRetry}
      className={className}
      data-testid={`achievement-error-${code || "default"}`}
      title={error ? "Could not load achievement data" : undefined}
      message={
        error ? (error.detail || error.message || undefined) : undefined
      }
    />
  );
}