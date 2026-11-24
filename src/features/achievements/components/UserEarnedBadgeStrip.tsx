"use client";

import { Award, EyeOff } from "lucide-react";

import {
  TIER_CONFIG,
  getBadgeIconComponent,
} from "@/features/achievements/components/shared/AchievementShared";
import { useUserBadges } from "@/features/achievements/hooks";
import type { EarnedBadge, BadgeTier } from "@/features/achievements/types";
import { ApiError } from "@/lib/api";

interface UserEarnedBadgeStripProps {
  userId: string | null;
  className?: string;
}

function BadgesHidden({ className }: { className?: string }) {
  return (
    <section
      data-testid="user-badges-hidden"
      aria-label="Badges hidden"
      className={`rounded-xl border border-border bg-card/80 p-5 backdrop-blur-xs shadow-xs ${className ?? ""}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <EyeOff aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight">Badges hidden</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This user has chosen to keep their badge collection private.
          </p>
        </div>
      </div>
    </section>
  );
}

function BadgesNoData({ className }: { className?: string }) {
  return (
    <section
      data-testid="user-badges-no-data"
      aria-label="No badges yet"
      className={`rounded-xl border border-border bg-card/80 p-5 backdrop-blur-xs shadow-xs ${className ?? ""}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Award aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight">No badges yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Once they earn a badge, the top featured ones will show up here.
          </p>
        </div>
      </div>
    </section>
  );
}

function UserEarnedBadgeStripSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-testid="user-earned-badge-strip-skeleton"
      aria-busy="true"
      className={`rounded-xl border border-border bg-card/80 p-5 space-y-3.5 backdrop-blur-xs shadow-xs ${className ?? ""}`}
    >
      <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-12 w-12 animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
    </div>
  );
}

function UserEarnedBadgeErrorState({
  error,
  onRetry,
  className,
}: {
  error: ApiError;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <section
      data-testid="user-earned-badge-strip-error"
      role="alert"
      className={`rounded-xl border border-destructive/40 bg-destructive/5 p-4 ${className ?? ""}`}
    >
      <p className="text-sm font-bold text-destructive">
        Could not load badges
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline"
      >
        Retry
      </button>
    </section>
  );
}

function BadgeChip({ badge }: { badge: EarnedBadge }) {
  const tierCfg = TIER_CONFIG[badge.tier as BadgeTier] ?? TIER_CONFIG.BRONZE;
  const BadgeIcon = getBadgeIconComponent(badge.code || badge.name);

  return (
    <li
      data-testid={`user-badge-chip-${badge.id}`}
      aria-label={badge.name}
      title={`${badge.name} (${badge.tier})`}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform hover:scale-105 ${tierCfg.iconBg}`}
    >
      <BadgeIcon
        aria-hidden="true"
        className="h-6 w-6"
      />
    </li>
  );
}

export function UserEarnedBadgeStrip({
  userId,
  className,
}: UserEarnedBadgeStripProps) {
  const isEnabled = true;

  const { profile, isLoading, error, retry, isPrivate } = useUserBadges(
    isEnabled ? userId : null,
  );

  if (!isEnabled) return null;
  if (userId === null) return null;

  if (isPrivate) {
    return <BadgesHidden className={className} />;
  }

  if (isLoading && !profile) {
    return <UserEarnedBadgeStripSkeleton className={className} />;
  }

  if (error && !profile) {
    return (
      <UserEarnedBadgeErrorState
        error={error as ApiError}
        onRetry={() => void retry()}
        className={className}
      />
    );
  }

  if (!profile) {
    return <BadgesNoData className={className} />;
  }

  return (
    <section
      data-testid="user-earned-badge-strip"
      aria-label="Public featured badges"
      className={`rounded-xl border border-border bg-card/80 p-5 space-y-3.5 backdrop-blur-xs shadow-xs ${className ?? ""}`}
    >
      <header>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Featured badges
        </h2>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {profile.totalBadges} total &middot; {profile.rareBadges} rare
          {profile.highestRank !== null
            ? ` · Highest rank #${profile.highestRank}`
            : ""}
        </p>
      </header>

      {profile.featuredBadges.length === 0 ? (
        <p
          data-testid="user-earned-badge-strip-empty"
          className="text-xs text-muted-foreground"
        >
          No featured badges to show.
        </p>
      ) : (
        <ol
          role="list"
          aria-label="Featured badges"
          className="flex flex-wrap gap-3"
        >
          {profile.featuredBadges.map((badge) => (
            <BadgeChip key={badge.id} badge={badge} />
          ))}
        </ol>
      )}
    </section>
  );
}
