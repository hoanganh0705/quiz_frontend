"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Calendar, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  AchievementHistorySkeleton,
  AchievementEmptyState,
  AchievementErrorState,
  TIER_CONFIG,
  getBadgeIconComponent,
} from "@/features/achievements/components/shared/AchievementShared";
import { useAchievementHistory } from "@/features/achievements/hooks";
import type {
  AchievementHistoryEntry,
  BadgeCategory,
  BadgeTier,
} from "@/features/achievements/types";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

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

export function AchievementHistory({ className }: AchievementHistoryProps) {
  const { isAuthenticated, bootstrapState } = useAuthSession();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const categoryFilter = parseCategory(searchParams?.get(QUERY_CATEGORY) ?? null);

  const setCategoryFilter = useCallback(
    (value: string | null) => {
      const params = new URLSearchParams(
        searchParams ? Array.from(searchParams.entries()) : [],
      );
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
    return <AchievementEmptyState variant="history" className={className} />;
  }

  return (
    <section
      data-testid="achievement-history"
      aria-busy={isStale || isLoadingMore}
      aria-label="Achievement history"
      className={`space-y-4 ${className ?? ""}`}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Achievement history
        </h2>
        {categoryFilter ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCategoryFilter(null)}
            aria-label="Clear category filter"
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filter
          </Button>
        ) : null}
      </header>

      <ol className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {items.map((entry) => (
          <HistoryRow key={entry.id} entry={entry} />
        ))}
      </ol>

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMore()}
            disabled={isLoadingMore}
            aria-label="Load more history"
            className="gap-2 font-medium"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Loading…</span>
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

interface HistoryRowProps {
  entry: AchievementHistoryEntry;
}

function HistoryRow({ entry }: HistoryRowProps) {
  const tierCfg = TIER_CONFIG[entry.tier as BadgeTier] ?? TIER_CONFIG.BRONZE;
  const BadgeIcon = getBadgeIconComponent(entry.name, undefined, entry.code);

  return (
    <li
      data-testid={`achievement-history-${entry.id}`}
      className={`flex items-center gap-3.5 rounded-xl border bg-card/80 p-3.5 backdrop-blur-xs transition-all duration-200 ${tierCfg.cardBorder}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tierCfg.iconBg}`}
      >
        <BadgeIcon aria-hidden="true" className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold tracking-tight text-foreground">
            {entry.name}
          </p>
          <span
            className={`inline-flex items-center rounded-xs px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider ${tierCfg.badgeBg} ${tierCfg.textColor} border ${tierCfg.badgeBorder}`}
          >
            {entry.tier}
          </span>
          {entry.category ? (
            <span className="hidden sm:inline-flex rounded-xs bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground uppercase">
              {entry.category}
            </span>
          ) : null}
        </div>
        <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground mt-0.5">
          <Calendar className="h-3 w-3 opacity-60" aria-hidden="true" />
          Earned {formatDate(entry.earnedAt)}
        </p>
      </div>
    </li>
  );
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
