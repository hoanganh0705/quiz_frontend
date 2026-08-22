"use client";

import * as React from "react";

import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Loader2, Trophy } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";
import { usePrefersReducedMotion } from "@/shared/hooks";

import {
  LeaderboardSkeleton,
  TournamentEmptyState,
  TournamentErrorState,
  TournamentStaleState,
} from "./shared";

import type { UseTournamentLeaderboardResult } from "@/features/tournaments/hooks/useTournamentLeaderboard";
import { LEADERBOARD_RANK_TOKENS } from "@/features/tournaments/lib/tournament-tokens";

export interface TournamentLeaderboardProps {
leaderboardResult: UseTournamentLeaderboardResult;
className?: string;
}

function formatScore(score: number): string {
return score.toLocaleString();
}

function getInitials(username: string): string {
return username
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getRankStyle(rank: number): string {
  const config = LEADERBOARD_RANK_TOKENS[rank as 1 | 2 | 3];
  if (config) return config;
  return "bg-muted text-muted-foreground";
}

export function TournamentLeaderboard({
  leaderboardResult,
  className,
}: TournamentLeaderboardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    isStale,
  } = leaderboardResult;

if (isLoading) {
return (
<div className={cn("space-y-4", className)}>
<h2 className="text-lg font-semibold">Leaderboard</h2>
<LeaderboardSkeleton count={10} />
</div>
    );
  }

if (error !== null) {
return (
<div className={cn("space-y-4", className)}>
<h2 className="text-lg font-semibold">Leaderboard</h2>
<TournamentErrorState error={error} onRetry={refresh} />
</div>
    );
  }

if (items.length === 0) {
return (
<div className={cn("space-y-4", className)}>
<h2 className="text-lg font-semibold">Leaderboard</h2>
<TournamentEmptyState variant="leaderboard" />
</div>
    );
  }

return (
<div className={cn("space-y-4", className)}>
<h2 className="text-lg font-semibold">Leaderboard</h2>

{isStale && (
<TournamentStaleState onRetry={refresh} />
      )}

<div className="space-y-2">
{items.map((entry) => (
<div
key={entry.id}
className="flex items-center gap-4 p-3 rounded-lg border"
          >
{/* Rank */}
<div
className={cn(
"flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm",
getRankStyle(entry.rank),
              )}
            >
{entry.rank <= 3 ? (
<Trophy className="h-4 w-4" aria-hidden="true" />
              ) : (
entry.rank
              )}
</div>

{/* Avatar */}
<Avatar className="h-10 w-10">
<AvatarFallback>{getInitials(entry.username)}</AvatarFallback>
</Avatar>

{/* User info */}
<div className="flex-1 min-w-0">
<p className="font-medium truncate">{entry.username}</p>
{entry.totalTimeMs > 0 && (
<p className="text-xs text-muted-foreground">
{Math.floor(entry.totalTimeMs / 60000)}m {Math.floor((entry.totalTimeMs % 60000) / 1000)}s
                </p>
              )}
</div>

{/* Score */}
<div className="text-right">
<p className="font-semibold">{formatScore(entry.score)}</p>
<p className="text-xs text-muted-foreground">points</p>
</div>
</div>
        ))}
</div>

{hasMore && (
<div className="flex justify-center py-2">
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-muted-foreground" aria-live="polite" aria-busy="true">
                  <Loader2 className={cn("h-4 w-4", !prefersReducedMotion && "animate-spin")} aria-hidden="true" />
                  <span className="text-sm">Loading more...</span>
                  <span className="sr-only">Loading more leaderboard entries...</span>
                </div>
              ) : (
                <Button onClick={loadMore} variant="outline" size="sm">
                  Load More
                </Button>
              )}
</div>
      )}
</div>
  );
}
