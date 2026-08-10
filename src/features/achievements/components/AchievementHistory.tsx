"use client";

/**
 * `AchievementHistory` — chronological achievement history surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.D4.
 *
 * ## What this component owns
 *
 * Renders the authenticated user's achievement history chronologically.
 * Supports an optional `category` filter that writes to local URL
 * query state for shareable / refreshable URLs.
 *
 * Exposes a `loadMore` button when the underlying paginated hook
 * reports `hasMore`.
 *
 * ## Auth gating
 *
 * Renders `null` when the user is unauthenticated.
 *
 * ## Feature flag gating
 *
 * Renders `null` when `achievements_live === 'placeholder'`.
 *
 * ## Loading / error / empty
 *
 * Delegates to the shared `AchievementHistorySkeleton`,
 * `AchievementEmptyState`, and `AchievementErrorState` primitives.
 */

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { Award } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useAchievementHistory } from "@/features/achievements/hooks";
import type {
  AchievementHistoryEntry,
  BadgeCategory,
  BadgeTier,
} from "@/features/achievements/types";
import {
  AchievementHistorySkeleton,
  AchievementEmptyState,
  AchievementErrorState,
} from "@/features/achievements/components/shared/AchievementShared";

interface AchievementHistoryProps {
  className?: string;
}

const QUERY_CATEGORY = "category";

function parseCategory(value: string | null): BadgeCategory | undefined {
  if (
    value === "PARTICIPATION" ||
    value === "PERFORMANCE" ||
    value === "STREAK" ||
    value === "TOURNAMENT" ||
    value === "SOCIAL" ||
    value === "SPECIAL"
  ) {
    return value;
  }
  return undefined;
}

const TIER_COLOR: Record<BadgeTier, string> = {
  BRONZE: "text-amber-700",
  SILVER: "text-slate-500",
  GOLD: "text-yellow-500",
  PLATINUM: "text-cyan-500",
  DIAMOND: "text-violet-500",
};

/**
 * Render the authenticated user's achievement history.
 *
 * Returns `null` when `achievements_live === 'placeholder'` or when
 * the user is unauthenticated. Category filter changes write to URL
 * query state.
 */
export function AchievementHistory({ className }: AchievementHistoryProps) {
  const flagValue = getFeatureFlagValue("achievements_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const { isAuthenticated, bootstrapState } = useAuthSession();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const categoryFilter = parseCategory(searchParams.get(QUERY_CATEGORY));

  const setCategoryFilter = useCallback(
    (value: string | null) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (value === null) {
        params.delete(QUERY_CATEGORY);
      } else {
        params.set(QUERY_CATEGORY, value);
      }
      const qs = params.toString();
      router.replace(qs.length > 0 ? `${pathname}?${qs}` : pathname, {
        scroll: false,
      });
    },
    [searchParams, router, pathname],
  );

  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    isStale,
  } = useAchievementHistory({ category: categoryFilter });

  if (isFlagPlaceholder) return null;
  if (!isAuthenticated && bootstrapState !== "bootstrapping") return null;

  if (isLoading && items.length === 0) {
    return <AchievementHistorySkeleton className={className} />;
  }

  if (error && items.length === 0) {
    return (
      <AchievementErrorState
        error={error}
        onRetry={() => void refresh()}
        className={className}
      />
    );
  }

  if (items.length === 0) {
    return (
      <AchievementEmptyState
        variant="history"
        className={className}
      />
    );
  }

  return (
    <section
      data-testid="achievement-history"
      aria-busy={isStale || isLoadingMore}
      aria-label="Achievement history"
      className={`space-y-3 ${className ?? ""}`}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Achievement history</h2>
        {categoryFilter ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCategoryFilter(null)}
            aria-label="Clear category filter"
          >
            Clear filter
          </Button>
        ) : null}
      </header>

      <ol className="space-y-2">
        {items.map((entry) => (
          <HistoryRow key={entry.id} entry={entry} />
        ))}
      </ol>

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMore()}
            disabled={isLoadingMore}
            aria-label="Load more history"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────

interface HistoryRowProps {
  entry: AchievementHistoryEntry;
}

function HistoryRow({ entry }: HistoryRowProps) {
  return (
    <li
      data-testid={`achievement-history-${entry.id}`}
      className="flex items-center gap-3 rounded-lg border bg-card p-3"
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full bg-muted ${TIER_COLOR[entry.tier]}`}
      >
        <Award aria-hidden="true" className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.name}</p>
        <p className="text-xs text-muted-foreground">
          Earned {formatDate(entry.earnedAt)}
        </p>
      </div>
    </li>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

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