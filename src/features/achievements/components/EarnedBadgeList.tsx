"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Progress } from "@/components/ui/Progress";
import { BadgeDetail } from "@/features/achievements/components/BadgeDetail";
import {
  EarnedBadgeListSkeleton,
  AchievementEmptyState,
  AchievementErrorState,
  TIER_CONFIG,
  getBadgeIconComponent,
} from "@/features/achievements/components/shared/AchievementShared";
import { useMyBadges } from "@/features/achievements/hooks";
import type { BadgeTier, EarnedBadge } from "@/features/achievements/types";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

interface EarnedBadgeListProps {
  className?: string;
}

export function EarnedBadgeList({ className }: EarnedBadgeListProps) {
  const { isAuthenticated, bootstrapState } = useAuthSession();
  const [inspectBadgeCode, setInspectBadgeCode] = useState<string | null>(null);

  const { badges, isLoading, error, retry, isStale } = useMyBadges();

  if (!isAuthenticated && bootstrapState !== "bootstrapping") return null;

  if (isLoading && badges.length === 0) {
    return <EarnedBadgeListSkeleton className={className} />;
  }

  if (error && badges.length === 0) {
    return (
      <AchievementErrorState
        error={error}
        onRetry={() => void retry()}
        className={className}
      />
    );
  }

  if (badges.length === 0) {
    return <AchievementEmptyState variant="earned" className={className} />;
  }

  return (
    <section
      data-testid="earned-badge-list"
      aria-busy={isStale}
      aria-label="Your earned badges"
      className={`space-y-4 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Your badges
        </h2>
      </div>

      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {badges.map((badge) => (
          <EarnedBadgeRow
            key={badge.id}
            badge={badge}
            onInspect={() => setInspectBadgeCode(badge.code || badge.id)}
          />
        ))}
      </ul>

      <Dialog
        open={Boolean(inspectBadgeCode)}
        onOpenChange={(open) => !open && setInspectBadgeCode(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Badge Details</DialogTitle>
            <DialogDescription className="sr-only">
              Detailed badge criteria, description, and earn statistics.
            </DialogDescription>
          </DialogHeader>
          {inspectBadgeCode ? <BadgeDetail code={inspectBadgeCode} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

interface EarnedBadgeRowProps {
  badge: EarnedBadge;
  onInspect: () => void;
}

function EarnedBadgeRow({ badge, onInspect }: EarnedBadgeRowProps) {
  const hasProgress =
    typeof badge.progress === "object" && badge.progress !== null;
  const isFullyEarned = !hasProgress || (badge.progress?.isComplete ?? false);

  const tierCfg = TIER_CONFIG[badge.tier as BadgeTier] ?? TIER_CONFIG.BRONZE;
  const BadgeIcon = getBadgeIconComponent(
    badge.name,
    badge.description,
    badge.code,
  );

  return (
    <li
      data-testid={`earned-badge-${badge.id}`}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${badge.name}`}
      aria-haspopup="dialog"
      onClick={onInspect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onInspect();
        }
      }}
      className={`group flex items-center gap-3.5 rounded-xl border bg-card/80 p-3.5 backdrop-blur-xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tierCfg.cardBorder} ${tierCfg.cardHoverGlow}`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${tierCfg.iconBg}`}
      >
        <BadgeIcon aria-hidden="true" className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              {badge.name}
            </p>
            <span
              className={`hidden sm:inline-flex items-center rounded-xs px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider ${tierCfg.badgeBg} ${tierCfg.textColor} border ${tierCfg.badgeBorder}`}
            >
              {badge.tier}
            </span>
          </div>

          {isFullyEarned ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide text-emerald-700 border border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Check className="h-3 w-3" aria-hidden="true" />
              Earned
            </span>
          ) : null}
        </div>

        {badge.description ? (
          <p className="truncate text-xs text-muted-foreground mt-0.5">
            {badge.description}
          </p>
        ) : null}

        {hasProgress && badge.progress ? (
          <div className="mt-2 flex items-center gap-2.5">
            <Progress
              value={badge.progress.percent}
              className="h-2 flex-1"
              aria-label={`${badge.progress.percent}% progress`}
            />
            <span className="font-mono text-xs tabular-nums text-muted-foreground font-medium">
              {badge.progress.percent}%
            </span>
          </div>
        ) : null}
      </div>
    </li>
  );
}
