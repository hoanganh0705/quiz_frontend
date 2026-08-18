"use client";

import { Crown } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useRankingLeaderboard } from "@/features/rankings/hooks";
import type {
RankingLeaderboardEntry,
RankingPeriod,
} from "@/features/rankings/types";
import {
LeaderboardTableSkeleton,
RankingEmptyState,
RankingErrorState,
} from "@/features/rankings/components/shared/RankingShared";

interface LeaderboardTableProps {

period?: RankingPeriod;

limit?: number;
className?: string;
}

export function LeaderboardTable({
period,
limit,
className,
}: LeaderboardTableProps) {
const flagValue = getFeatureFlagValue("rankings_live");
const isFlagPlaceholder = flagValue === "placeholder";

const {
items,
isLoading,
isLoadingMore,
hasMore,
loadMore,
error,
refresh,
isStale,
  } = useRankingLeaderboard({ period, limit });

if (isFlagPlaceholder) return null;

if (isLoading && items.length === 0) {
return <LeaderboardTableSkeleton className={className} />;
  }

if (error && items.length === 0) {
return (
<RankingErrorState
error={error}
onRetry={() => void refresh()}
className={className}
      />
    );
  }

if (items.length === 0) {
return (
<RankingEmptyState
variant="leaderboard"
className={className}
      />
    );
  }

return (
<section
data-testid="leaderboard-table"
aria-busy={isStale || isLoadingMore}
aria-label="Global leaderboard"
className={`rounded-lg border bg-card overflow-hidden ${className ?? ""}`}
    >
<ol
className="divide-y divide-border"
aria-label="Leaderboard rankings"
      >
{items.map((entry) => (
<LeaderboardRow key={entry.id} entry={entry} />
        ))}
</ol>

{hasMore ? (
<div className="flex justify-center border-t p-3">
<Button
variant="outline"
size="sm"
onClick={() => loadMore()}
disabled={isLoadingMore}
aria-label="Load more leaderboard entries"
          >
{isLoadingMore ? "Loading…" : "Load more"}
</Button>
</div>
      ) : null}
</section>
  );
}

interface LeaderboardRowProps {
entry: RankingLeaderboardEntry;
}

function LeaderboardRow({ entry }: LeaderboardRowProps) {
const isYou = entry.isCurrentUser === true;
return (
<li
data-testid={`leaderboard-row-${entry.userId}`}
className={
isYou
? "flex items-center gap-3 px-3 py-2 bg-primary/5 ring-1 ring-primary/30"
: "flex items-center gap-3 px-3 py-2 hover:bg-muted/40"
      }
    >
<span
aria-label={`Rank ${entry.rank}`}
className="inline-flex h-6 w-10 items-center justify-center rounded text-xs font-semibold tabular-nums text-muted-foreground"
      >
{entry.denseRank === 1 ? (
<Crown
aria-hidden="true"
className="h-3.5 w-3.5 text-amber-500"
          />
        ) : null}
{entry.rank}
</span>

<div className="flex min-w-0 flex-1 items-center gap-2">
<span className="truncate text-sm font-medium">
{entry.displayName}
</span>
{isYou ? (
<span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
You
          </span>
        ) : null}
{entry.isTied ? (
<span className="text-[10px] text-muted-foreground">tied</span>
        ) : null}
</div>

<span
aria-label={`${entry.xp} XP`}
className="shrink-0 text-sm tabular-nums text-muted-foreground"
      >
{entry.xp.toLocaleString()} XP
      </span>
</li>
  );
}