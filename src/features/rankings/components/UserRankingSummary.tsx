"use client";

import { Lock, TrendingUp } from "lucide-react";

import { ApiError } from "@/lib/api";

import { isRankingSurfaceEnabled } from "@/features/rankings/flags";
import { useUserRanking } from "@/features/rankings/hooks";
import { ConsistencyNotice } from "@/features/rankings/components/shared/ConsistencyNotice";

interface UserRankingSummaryProps {

userId: string | null;

displayName?: string | null;
className?: string;
}

function RankingHidden({ className }: { className?: string }) {
return (
<section
data-testid="user-ranking-hidden"
aria-label="Ranking hidden"
className={`rounded-lg border bg-card p-4 ${className ?? ""}`}
    >
<div className="flex items-start gap-3">
<Lock
aria-hidden="true"
className="mt-0.5 h-5 w-5 text-muted-foreground"
        />
<div>
<p className="text-sm font-medium">Ranking hidden</p>
<p className="mt-0.5 text-xs text-muted-foreground">
This user has chosen to keep their ranking private.
          </p>
</div>
</div>
</section>
  );
}

function RankingNoData({ className }: { className?: string }) {
return (
<section
data-testid="user-ranking-no-data"
aria-label="No ranking data"
className={`rounded-lg border bg-card p-4 ${className ?? ""}`}
    >
<div className="flex items-start gap-3">
<TrendingUp
aria-hidden="true"
className="mt-0.5 h-5 w-5 text-muted-foreground"
        />
<div>
<p className="text-sm font-medium">No ranking data yet</p>
<p className="mt-0.5 text-xs text-muted-foreground">
Once they play a quiz, their ranking will show up here.
          </p>
</div>
</div>
</section>
  );
}

function UserRankingSummarySkeleton({ className }: { className?: string }) {
return (
<div
data-testid="user-ranking-skeleton"
aria-busy="true"
className={`rounded-lg border bg-card p-4 ${className ?? ""}`}
    >
<div className="grid grid-cols-2 gap-4">
<div className="space-y-1">
<div className="h-3 w-20 animate-pulse rounded bg-muted" />
<div className="h-6 w-24 animate-pulse rounded bg-muted" />
</div>
<div className="space-y-1">
<div className="h-3 w-16 animate-pulse rounded bg-muted" />
<div className="h-6 w-28 animate-pulse rounded bg-muted" />
</div>
</div>
</div>
  );
}

function UserRankingErrorState({
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
data-testid="user-ranking-error"
role="alert"
className={`rounded-lg border border-destructive/40 bg-destructive/5 p-4 ${className ?? ""}`}
    >
<p className="text-sm font-medium text-destructive">
Could not load ranking
      </p>
<p className="mt-0.5 text-xs text-muted-foreground">
{error.message}
</p>
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

export function UserRankingSummary({
userId,

displayName,
className,
}: UserRankingSummaryProps) {
const isLive = isRankingSurfaceEnabled();

const {
ranking,
isLoading,
isStale,
error,
retry,
isPrivate,
  } = useUserRanking(isLive ? userId : null);

if (!isLive) return null;
if (userId === null) return null;

if (isPrivate) {
return <RankingHidden className={className} />;
  }

if (isLoading && !ranking) {
return <UserRankingSummarySkeleton className={className} />;
  }

if (error && !ranking) {
return (
<UserRankingErrorState
error={error as ApiError}
onRetry={() => void retry()}
className={className}
      />
    );
  }

if (!ranking) {
return <RankingNoData className={className} />;
  }

return (
<section
data-testid="user-ranking-summary"
aria-label="Public ranking"
className={`rounded-lg border bg-card p-4 space-y-3 ${className ?? ""}`}
    >
<header className="flex items-center justify-between gap-2">
<h2 className="text-sm font-semibold">Public ranking</h2>
{/*
          `useUserRanking` does not expose `lastValidatedAt` (it is
          built on `useSingleWithRetry`, which does not surface the
          successful-response timestamp). The notice still renders
          the "Refreshing…" affordance while `isStale` is true; the
          timestamp is omitted.
        */}
<ConsistencyNotice isStale={isStale} />
</header>

<div className="grid grid-cols-2 gap-4">
<div>
<p className="text-xs uppercase tracking-wide text-muted-foreground">
Global rank
          </p>
<p className="mt-1 text-2xl font-semibold tabular-nums">
{ranking.globalRank ?? "—"}
</p>
</div>
<div>
<p className="text-xs uppercase tracking-wide text-muted-foreground">
Total XP
          </p>
<p className="mt-1 text-2xl font-semibold tabular-nums">
{ranking.totalScore.toLocaleString()}
</p>
</div>
</div>
</section>
  );
}
