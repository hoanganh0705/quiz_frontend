"use client";

import { Award } from "lucide-react";

import { Progress } from "@/components/ui/Progress";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useMyBadges } from "@/features/achievements/hooks";
import type {
BadgeTier,
EarnedBadge,
} from "@/features/achievements/types";
import {
EarnedBadgeListSkeleton,
AchievementEmptyState,
AchievementErrorState,
} from "@/features/achievements/components/shared/AchievementShared";

interface EarnedBadgeListProps {
className?: string;
}

const TIER_COLOR: Record<BadgeTier, string> = {
BRONZE: "text-amber-700",
SILVER: "text-slate-500",
GOLD: "text-yellow-500",
PLATINUM: "text-cyan-500",
DIAMOND: "text-violet-500",
};

export function EarnedBadgeList({ className }: EarnedBadgeListProps) {
const flagValue = getFeatureFlagValue("achievements_live");
const isFlagPlaceholder = flagValue === "placeholder";

const { isAuthenticated, bootstrapState } = useAuthSession();

const { badges, isLoading, error, retry, isStale } = useMyBadges();

if (isFlagPlaceholder) return null;
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
return (
<AchievementEmptyState
variant="earned"
className={className}
      />
    );
  }

return (
<section
data-testid="earned-badge-list"
aria-busy={isStale}
aria-label="Your earned badges"
className={`space-y-3 ${className ?? ""}`}
    >
<h2 className="text-sm font-semibold">Your badges</h2>
<ul className="space-y-2">
{badges.map((badge) => (
<EarnedBadgeRow key={badge.id} badge={badge} />
        ))}
</ul>
</section>
  );
}

interface EarnedBadgeRowProps {
badge: EarnedBadge;
}

function EarnedBadgeRow({ badge }: EarnedBadgeRowProps) {
const hasProgress = typeof badge.progress === "object" && badge.progress !== null;

const isFullyEarned = !hasProgress || (badge.progress?.isComplete ?? false);
return (
<li
data-testid={`earned-badge-${badge.id}`}
className="flex items-center gap-3 rounded-lg border bg-card p-3"
    >
<div
className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${TIER_COLOR[badge.tier]}`}
      >
<Award aria-hidden="true" className="h-5 w-5" />
</div>
<div className="min-w-0 flex-1">
<div className="flex items-center justify-between gap-2">
<p className="truncate text-sm font-medium">{badge.name}</p>
{isFullyEarned ? (
<span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
Earned
            </span>
          ) : null}
</div>
{badge.description ? (
<p className="truncate text-xs text-muted-foreground">
{badge.description}
</p>
        ) : null}
{hasProgress && badge.progress ? (
<div className="mt-1.5 flex items-center gap-2">
<Progress
value={badge.progress.percent}
className="h-1.5 flex-1"
aria-label={`${badge.progress.percent}% progress`}
            />
<span className="text-[10px] tabular-nums text-muted-foreground">
{badge.progress.percent}%
            </span>
</div>
        ) : null}
</div>
</li>
  );
}