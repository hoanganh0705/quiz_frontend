"use client";

import { Award, EyeOff } from "lucide-react";

import { ApiError } from "@/lib/api";

import { isAchievementSurfaceEnabled } from "@/features/achievements/flags";
import { useUserBadges } from "@/features/achievements/hooks";
import type { EarnedBadge, BadgeTier } from "@/features/achievements/types";

interface UserEarnedBadgeStripProps {

userId: string | null;
className?: string;
}

const TIER_COLOR: Record<BadgeTier, string> = {
BRONZE: "text-amber-700",
SILVER: "text-slate-500",
GOLD: "text-yellow-500",
PLATINUM: "text-cyan-500",
DIAMOND: "text-violet-500",
};

function BadgesHidden({ className }: { className?: string }) {
return (
<section
data-testid="user-badges-hidden"
aria-label="Badges hidden"
className={`rounded-lg border bg-card p-4 ${className ?? ""}`}
    >
<div className="flex items-start gap-3">
<EyeOff
aria-hidden="true"
className="mt-0.5 h-5 w-5 text-muted-foreground"
        />
<div>
<p className="text-sm font-medium">Badges hidden</p>
<p className="mt-0.5 text-xs text-muted-foreground">
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
className={`rounded-lg border bg-card p-4 ${className ?? ""}`}
    >
<div className="flex items-start gap-3">
<Award
aria-hidden="true"
className="mt-0.5 h-5 w-5 text-muted-foreground"
        />
<div>
<p className="text-sm font-medium">No badges yet</p>
<p className="mt-0.5 text-xs text-muted-foreground">
Once they earn a badge, the top featured ones will show up
            here.
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
className={`rounded-lg border bg-card p-4 space-y-3 ${className ?? ""}`}
    >
<div className="h-3 w-32 animate-pulse rounded bg-muted" />
<div className="flex gap-3">
{Array.from({ length: 4 }).map((_, idx) => (
<div
key={idx}
className="h-12 w-12 animate-pulse rounded-full bg-muted"
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
className={`rounded-lg border border-destructive/40 bg-destructive/5 p-4 ${className ?? ""}`}
    >
<p className="text-sm font-medium text-destructive">
Could not load badges
      </p>
<p className="mt-0.5 text-xs text-muted-foreground">{error.message}</p>
<button
type="button"
onClick={onRetry}
className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
Retry
      </button>
</section>
  );
}

function BadgeChip({ badge }: { badge: EarnedBadge }) {
return (
<li
data-testid={`user-badge-chip-${badge.id}`}
aria-label={badge.name}
className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted"
    >
<Award
aria-hidden="true"
className={`h-5 w-5 ${TIER_COLOR[badge.tier]}`}
      />
</li>
  );
}

export function UserEarnedBadgeStrip({
userId,
className,
}: UserEarnedBadgeStripProps) {
const isLive = isAchievementSurfaceEnabled();

const { profile, isLoading, error, retry, isPrivate } = useUserBadges(
isLive ? userId : null,
  );

if (!isLive) return null;
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
className={`rounded-lg border bg-card p-4 space-y-3 ${className ?? ""}`}
    >
<header>
<h2 className="text-sm font-semibold">Featured badges</h2>
<p className="mt-0.5 text-xs text-muted-foreground">
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
