"use client";

import { Award, Lock, Sparkles, Users } from "lucide-react";

import {
  BadgeDetailSkeleton,
  AchievementErrorState,
  TIER_CONFIG,
  getBadgeIconComponent,
} from "@/features/achievements/components/shared/AchievementShared";
import { useBadge } from "@/features/achievements/hooks";
import type { BadgeTier } from "@/features/achievements/types";

interface BadgeDetailProps {
  code: string;
  className?: string;
}

export function BadgeDetail({ code, className }: BadgeDetailProps) {
  const isCodeEmpty = typeof code !== "string" || code.length === 0;
  const effectiveCode = isCodeEmpty ? null : code;
  const { badge, isLoading, error, retry, isPrivate } = useBadge(effectiveCode);

  const errorCode = String(error?.code ?? "");
  const isDeferred = errorCode === "BADGE_DEFERRED";

  if (isCodeEmpty) return null;

  if (isLoading && !badge) {
    return <BadgeDetailSkeleton className={className} />;
  }

  if (error && !badge) {
    if (isPrivate) {
      return (
        <section
          data-testid="badge-detail-hidden"
          aria-label="Badge hidden"
          className={`rounded-xl border border-border bg-card/80 p-8 text-center backdrop-blur-xs shadow-xs ${className ?? ""}`}
        >
          <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Lock aria-hidden="true" className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold tracking-tight">Badge hidden</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This badge is no longer available. It may have been retired or removed from the catalog.
          </p>
        </section>
      );
    }
    return (
      <AchievementErrorState
        error={error}
        onRetry={() => void retry()}
        className={className}
      />
    );
  }

  if (!badge) {
    return null;
  }

  if (badge.deprecated) {
    return (
      <section
        data-testid="badge-detail-tombstone"
        aria-label="Deprecated badge"
        className={`rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center ${className ?? ""}`}
      >
        <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Award aria-hidden="true" className="h-7 w-7" />
        </div>
        <h2 className="text-base font-bold tracking-tight">This badge has been retired</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The &ldquo;{badge.name}&rdquo; badge is no longer awarded. Existing
          earners retain their achievement.
        </p>
      </section>
    );
  }

  const tierCfg = TIER_CONFIG[badge.tier as BadgeTier] ?? TIER_CONFIG.BRONZE;
  const BadgeIcon = getBadgeIconComponent(badge.name, badge.description, badge.code);

  return (
    <article
      data-testid="badge-detail"
      aria-label={`Badge detail: ${badge.name}`}
      className={`space-y-5 ${className ?? ""}`}
    >
      <header className="flex items-center gap-4">
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform ${tierCfg.iconBg}`}
        >
          <BadgeIcon aria-hidden="true" className="h-10 w-10" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-xl sm:text-2xl font-bold tracking-tight">
              {badge.name}
            </h2>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${tierCfg.badgeBg} ${tierCfg.textColor} border ${tierCfg.badgeBorder}`}
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {badge.tier}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center justify-end gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Earned by
          </p>
          <p className="font-mono text-base sm:text-lg font-bold tabular-nums">
            {badge.totalEarned.toLocaleString()}
          </p>
        </div>
      </header>

      {badge.description ? (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
          <p className="text-sm leading-relaxed text-foreground/90">
            {badge.description}
          </p>
        </div>
      ) : null}

      {isDeferred ? (
        <p
          role="note"
          className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-400"
        >
          This badge is not yet available. Earn conditions are coming soon.
        </p>
      ) : null}
    </article>
  );
}
