"use client";

import { Award, Lock } from "lucide-react";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useBadge } from "@/features/achievements/hooks";
import type { BadgeTier } from "@/features/achievements/types";
import {
BadgeDetailSkeleton,
AchievementErrorState,
} from "@/features/achievements/components/shared/AchievementShared";

interface BadgeDetailProps {

code: string;
className?: string;
}

const TIER_COLOR: Record<BadgeTier, string> = {
BRONZE: "text-amber-700",
SILVER: "text-slate-500",
GOLD: "text-yellow-500",
PLATINUM: "text-cyan-500",
DIAMOND: "text-violet-500",
};

export function BadgeDetail({ code, className }: BadgeDetailProps) {
const flagValue = getFeatureFlagValue("achievements_live");
const isFlagPlaceholder = flagValue === "placeholder";
const isCodeEmpty = typeof code !== "string" || code.length === 0;

const effectiveCode =
isFlagPlaceholder || isCodeEmpty ? null : code;
const { badge, isLoading, error, retry, isPrivate } = useBadge(effectiveCode);

const errorCode = String(error?.code ?? "");
const isDeferred = errorCode === "BADGE_DEFERRED";

if (isFlagPlaceholder) return null;
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
className={`rounded-lg border bg-card p-6 text-center ${className ?? ""}`}
        >
<Lock
aria-hidden="true"
className="mx-auto mb-3 h-8 w-8 text-muted-foreground"
          />
<h2 className="text-base font-semibold">Badge hidden</h2>
<p className="mt-1 text-sm text-muted-foreground">
This badge is no longer available. It may have been retired or
            removed from the catalog.
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
className={`rounded-lg border border-dashed bg-muted/30 p-6 text-center ${className ?? ""}`}
      >
<Award
aria-hidden="true"
className="mx-auto mb-3 h-10 w-10 text-muted-foreground"
        />
<h2 className="text-base font-semibold">This badge has been retired</h2>
<p className="mt-1 text-sm text-muted-foreground">
The &ldquo;{badge.name}&rdquo; badge is no longer awarded. Existing
          earners retain their achievement.
        </p>
</section>
    );
  }

return (
<article
data-testid="badge-detail"
aria-label={`Badge detail: ${badge.name}`}
className={`space-y-4 ${className ?? ""}`}
    >
<header className="flex items-center gap-4">
<div
className={`flex h-20 w-20 items-center justify-center rounded-full bg-muted ${TIER_COLOR[badge.tier]}`}
        >
<Award aria-hidden="true" className="h-10 w-10" />
</div>
<div className="min-w-0 flex-1">
<h2 className="truncate text-xl font-semibold">{badge.name}</h2>
<p
className={`text-xs uppercase tracking-wide ${TIER_COLOR[badge.tier]}`}
          >
{badge.tier}
</p>
</div>
<div className="text-right">
<p className="text-xs uppercase tracking-wide text-muted-foreground">
Earned by
          </p>
<p className="text-base font-semibold tabular-nums">
{badge.totalEarned.toLocaleString()}
</p>
</div>
</header>

{badge.description ? (
<p className="text-sm text-foreground/80">{badge.description}</p>
      ) : null}

{isDeferred ? (
<p
role="note"
className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground"
        >
This badge is not yet available. Earn conditions are coming soon.
        </p>
      ) : null}
</article>
  );
}